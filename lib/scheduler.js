/**
 * In-House Notification Scheduler
 * Uses node-schedule for efficient job scheduling
 * Processes notifications directly (no HTTP calls)
 */

const schedule = require('node-schedule')
const mongoose = require('mongoose')

// Store active jobs for management
const activeJobs = new Map()
let isInitialized = false
let processingLock = false

/**
 * Initialize the scheduler
 * @param {number} port - Server port (for logging)
 */
function initializeScheduler(port) {
    if (isInitialized) {
        console.log('⚠️ Scheduler already initialized')
        return
    }

    console.log('📅 Initializing Notification Scheduler...')

    // Main job: Process due notifications every minute
    const mainJob = schedule.scheduleJob('notification-processor', '*/1 * * * *', async () => {
        await processNotificationsDirectly()
    })
    activeJobs.set('notification-processor', mainJob)

    // Attendance scheduler: Check every minute
    const attendanceJob = schedule.scheduleJob('attendance-processor', '*/1 * * * *', async () => {
        await processAttendanceNotifications(port)
    })
    activeJobs.set('attendance-processor', attendanceJob)

    isInitialized = true

    console.log('✅ Notification Scheduler initialized successfully')
    console.log('   📬 Notification processor: Every minute (direct DB processing)')
    console.log('   📋 Attendance processor: Every minute')
    console.log('   🔑 MongoDB: Connected via existing connection')

    // Run immediately on startup
    setTimeout(async () => {
        console.log('🚀 Running initial notification check...')
        await processNotificationsDirectly()
    }, 5000)

    return getSchedulerStatus()
}

/**
 * Process scheduled and recurring notifications directly from database
 */
async function processNotificationsDirectly() {
    if (processingLock) {
        return
    }

    processingLock = true
    const startTime = Date.now()

    try {
        // Ensure mongoose is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('[Scheduler] Waiting for MongoDB connection...')
            processingLock = false
            return
        }

        const now = new Date()

        // Import models dynamically to avoid circular dependencies
        const ScheduledNotification = mongoose.models.ScheduledNotification ||
            require('../models/ScheduledNotification').default
        const RecurringNotification = mongoose.models.RecurringNotification ||
            require('../models/RecurringNotification').default
        const Notification = mongoose.models.Notification ||
            require('../models/Notification').default
        const User = mongoose.models.User ||
            require('../models/User').default
        const Employee = mongoose.models.Employee ||
            require('../models/Employee').default

        // Also load Department model since we use populate
        if (!mongoose.models.Department) {
            require('../models/Department')
        }

        // ========== PROCESS SCHEDULED NOTIFICATIONS ==========
        const dueScheduled = await ScheduledNotification.find({
            status: 'pending',
            scheduledFor: { $lte: now }
        }).populate('targetDepartment')

        let scheduledProcessed = 0
        let scheduledFailed = 0

        for (const notif of dueScheduled) {
            try {
                // Get target users based on targetType
                let userIds = await getTargetUsers(notif, User, Employee)

                if (userIds.length === 0) {
                    notif.status = 'failed'
                    notif.error = 'No users found matching criteria'
                    await notif.save()
                    scheduledFailed++
                    console.log(`[Scheduler] ❌ Scheduled "${notif.title}" failed - no users`)
                    continue
                }

                // Create notification records for each user
                const notificationRecords = userIds.map(userId => ({
                    user: userId,
                    title: notif.title,
                    message: notif.message,
                    url: notif.url || '/dashboard',
                    type: 'scheduled',
                    priority: 'medium',
                    data: { scheduledId: notif._id.toString() },
                    createdAt: now
                }))

                await Notification.insertMany(notificationRecords)

                // Update scheduled notification status
                notif.status = 'sent'
                notif.sentAt = now
                notif.recipientCount = userIds.length
                notif.successCount = userIds.length
                await notif.save()

                scheduledProcessed++
                console.log(`[Scheduler] ✅ Scheduled "${notif.title}" sent to ${userIds.length} users`)

                // Emit socket event if available
                if (global.io) {
                    userIds.forEach(userId => {
                        global.io.to(`user:${userId}`).emit('new-notification', {
                            title: notif.title,
                            message: notif.message,
                            type: 'scheduled'
                        })
                    })
                }

            } catch (error) {
                console.error(`[Scheduler] Error processing scheduled ${notif._id}:`, error.message)
                notif.status = 'failed'
                notif.error = error.message
                await notif.save()
                scheduledFailed++
            }
        }

        // ========== PROCESS RECURRING NOTIFICATIONS ==========
        const dueRecurring = await RecurringNotification.find({
            isActive: true,
            nextScheduledAt: { $lte: now },
            $or: [
                { endDate: null },
                { endDate: { $gte: now } }
            ]
        }).populate('targetDepartment')

        let recurringProcessed = 0
        let recurringFailed = 0

        for (const notif of dueRecurring) {
            try {
                // Get target users
                let userIds = await getTargetUsers(notif, User, Employee)

                if (userIds.length === 0) {
                    notif.totalFailure = (notif.totalFailure || 0) + 1
                    notif.nextScheduledAt = calculateNextSchedule(notif)
                    await notif.save()
                    recurringFailed++
                    console.log(`[Scheduler] ❌ Recurring "${notif.title}" failed - no users`)
                    continue
                }

                // Create notification records
                const notificationRecords = userIds.map(userId => ({
                    user: userId,
                    title: notif.title,
                    message: notif.message,
                    url: notif.url || '/dashboard',
                    type: 'recurring',
                    priority: 'medium',
                    data: { recurringId: notif._id.toString() },
                    createdAt: now
                }))

                await Notification.insertMany(notificationRecords)

                // Update recurring notification stats
                notif.lastSentAt = now
                notif.totalSent = (notif.totalSent || 0) + 1
                notif.totalSuccess = (notif.totalSuccess || 0) + 1
                notif.nextScheduledAt = calculateNextSchedule(notif)

                if (!notif.nextScheduledAt) {
                    notif.isActive = false
                }

                await notif.save()

                recurringProcessed++
                console.log(`[Scheduler] ✅ Recurring "${notif.title}" sent to ${userIds.length} users, next: ${notif.nextScheduledAt}`)

                // Emit socket event
                if (global.io) {
                    userIds.forEach(userId => {
                        global.io.to(`user:${userId}`).emit('new-notification', {
                            title: notif.title,
                            message: notif.message,
                            type: 'recurring'
                        })
                    })
                }

            } catch (error) {
                console.error(`[Scheduler] Error processing recurring ${notif._id}:`, error.message)
                notif.totalFailure = (notif.totalFailure || 0) + 1
                notif.nextScheduledAt = calculateNextSchedule(notif)
                await notif.save()
                recurringFailed++
            }
        }

        const duration = Date.now() - startTime

        // Only log if something was processed
        if (dueScheduled.length > 0 || dueRecurring.length > 0) {
            console.log(`[Scheduler] Completed in ${duration}ms - Scheduled: ${scheduledProcessed}/${dueScheduled.length}, Recurring: ${recurringProcessed}/${dueRecurring.length}`)
        }

    } catch (error) {
        console.error('[Scheduler] Error:', error.message)
    } finally {
        processingLock = false
    }
}

/**
 * Get target user IDs based on notification target settings
 */
async function getTargetUsers(notif, User, Employee) {
    let userIds = []

    try {
        if (notif.targetType === 'all') {
            const users = await User.find({ isActive: { $ne: false } }).select('_id')
            userIds = users.map(u => u._id.toString())
        } else if (notif.targetType === 'department' && notif.targetDepartment) {
            const deptId = notif.targetDepartment._id || notif.targetDepartment
            const employees = await Employee.find({
                department: deptId,
                status: 'active'
            }).select('_id')

            const employeeIds = employees.map(e => e._id)
            const users = await User.find({ employeeId: { $in: employeeIds } }).select('_id')
            userIds = users.map(u => u._id.toString())
        } else if (notif.targetType === 'role' && notif.targetRoles?.length > 0) {
            const users = await User.find({
                role: { $in: notif.targetRoles },
                isActive: { $ne: false }
            }).select('_id')
            userIds = users.map(u => u._id.toString())
        } else if (notif.targetType === 'specific' && notif.targetUsers?.length > 0) {
            userIds = notif.targetUsers.map(id => id.toString())
        }
    } catch (error) {
        console.error('[Scheduler] Error getting target users:', error.message)
    }

    return userIds
}

/**
 * Calculate next schedule time for recurring notifications
 */
function calculateNextSchedule(notif) {
    const now = new Date()

    if (notif.endDate && now > notif.endDate) {
        return null
    }

    let nextDate = new Date(now)

    switch (notif.frequency) {
        case 'daily':
            if (notif.dailyTime) {
                const [hours, minutes] = notif.dailyTime.split(':')
                nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                if (nextDate <= now) {
                    nextDate.setDate(nextDate.getDate() + 1)
                }
            } else {
                nextDate.setDate(nextDate.getDate() + 1)
            }
            break

        case 'weekly':
            if (notif.weeklyDays?.length > 0 && notif.weeklyTime) {
                const [hours, minutes] = notif.weeklyTime.split(':')
                const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

                const currentDay = now.getDay()
                const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
                const targetTimeMinutes = parseInt(hours) * 60 + parseInt(minutes)
                const targetDays = notif.weeklyDays.map(d => dayMap[d]).sort((a, b) => a - b)

                let daysToAdd = null
                for (const targetDay of targetDays) {
                    if (targetDay === currentDay && currentTimeMinutes < targetTimeMinutes) {
                        daysToAdd = 0
                        break
                    } else if (targetDay > currentDay) {
                        daysToAdd = targetDay - currentDay
                        break
                    }
                }

                if (daysToAdd === null) {
                    daysToAdd = 7 - currentDay + targetDays[0]
                }

                nextDate.setDate(nextDate.getDate() + daysToAdd)
                nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
            } else {
                nextDate.setDate(nextDate.getDate() + 7)
            }
            break

        case 'monthly':
            if (notif.monthlyDay && notif.monthlyTime) {
                const [hours, minutes] = notif.monthlyTime.split(':')
                nextDate.setDate(notif.monthlyDay)
                nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

                if (nextDate <= now) {
                    nextDate.setMonth(nextDate.getMonth() + 1)
                    nextDate.setDate(notif.monthlyDay)
                }
            } else {
                nextDate.setMonth(nextDate.getMonth() + 1)
            }
            break

        default:
            nextDate.setDate(nextDate.getDate() + 1)
    }

    return nextDate
}

/**
 * Process attendance-based notifications
 */
async function processAttendanceNotifications(port) {
    try {
        const response = await fetch(`http://localhost:${port}/api/attendance/scheduler`, {
            method: 'GET',
            headers: { 'x-cron-secret': 'internal' }
        })

        if (response.ok) {
            const data = await response.json()
            if (data.data?.triggered?.length > 0) {
                console.log(`[Scheduler] Attendance: ${data.data.triggered.length} notifications`)
            }
        }
    } catch (error) {
        // Silently handle
    }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
    const jobs = []
    activeJobs.forEach((job, id) => {
        jobs.push({
            id,
            nextInvocation: job.nextInvocation()?.toISOString() || null
        })
    })

    return { initialized: isInitialized, activeJobs: jobs.length, jobs }
}

/**
 * Shutdown the scheduler gracefully
 */
function shutdownScheduler() {
    console.log('🛑 Shutting down scheduler...')
    activeJobs.forEach((job, id) => {
        job.cancel()
    })
    activeJobs.clear()
    isInitialized = false
    console.log('✅ Scheduler shutdown complete')
}

module.exports = {
    initializeScheduler,
    getSchedulerStatus,
    shutdownScheduler,
    processNotificationsDirectly
}
