import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Leave from '@/models/Leave'
import CompanySettings from '@/models/CompanySettings'
import { sendPushToUser } from '@/lib/pushNotification'

export const dynamic = 'force-dynamic'

/**
 * POST - Mark absent employees for a specific date or date range
 * This can be used to backfill absent records for past days
 * 
 * Body: { date?: string, startDate?: string, endDate?: string }
 */
export async function POST(request) {
  try {
    // Verify internal call or admin token
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')
    
    // Allow internal calls from server.js or calls with valid CRON_SECRET
    const isInternalCall = cronSecret === 'internal'
    const isValidCronSecret = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET
    
    if (!isInternalCall && !isValidCronSecret && !authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const body = await request.json().catch(() => ({}))
    const { date, startDate, endDate, sendNotifications = false } = body

    const settings = await CompanySettings.findOne().lean()
    
    // Determine date range
    let dateRangeStart, dateRangeEnd
    
    if (date) {
      // Single date
      dateRangeStart = new Date(date)
      dateRangeStart.setHours(0, 0, 0, 0)
      dateRangeEnd = new Date(dateRangeStart)
      dateRangeEnd.setDate(dateRangeEnd.getDate() + 1)
    } else if (startDate && endDate) {
      // Date range
      dateRangeStart = new Date(startDate)
      dateRangeStart.setHours(0, 0, 0, 0)
      dateRangeEnd = new Date(endDate)
      dateRangeEnd.setHours(23, 59, 59, 999)
    } else {
      // Default to yesterday (safer to not process today)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      dateRangeStart = yesterday
      dateRangeEnd = new Date(yesterday)
      dateRangeEnd.setDate(dateRangeEnd.getDate() + 1)
    }

    // Don't process future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dateRangeStart >= today) {
      return NextResponse.json({
        success: false,
        message: 'Cannot mark absent for today or future dates'
      }, { status: 400 })
    }

    // Get all active employees
    const allEmployees = await Employee.find({
      status: 'active'
    }).populate('user', '_id email firstName lastName').lean()

    const results = {
      processed: 0,
      marked: 0,
      skipped: 0,
      errors: 0,
      dates: []
    }

    // Process each day in the range
    let currentDate = new Date(dateRangeStart)
    while (currentDate < dateRangeEnd && currentDate < today) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      // Skip weekends if configured
      const dayOfWeek = currentDate.getDay()
      if (settings?.workingDays && !settings.workingDays.includes(dayOfWeek)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Get employees on approved leave for this day
      const leavesForDay = await Leave.find({
        status: 'approved',
        startDate: { $lte: dayStart },
        endDate: { $gte: dayStart }
      }).select('employee').lean()

      const onLeaveIds = new Set(leavesForDay.map(l => l.employee.toString()))

      // Get all attendance records for this day
      const dayAttendance = await Attendance.find({
        date: { $gte: dayStart, $lt: dayEnd }
      }).lean()

      const employeesWithAttendance = new Set(dayAttendance.map(a => a.employee.toString()))

      // Find employees who don't have any attendance record for this day
      const employeesWithoutAttendance = allEmployees.filter(emp => 
        !employeesWithAttendance.has(emp._id.toString()) && 
        !onLeaveIds.has(emp._id.toString()) &&
        emp.user // Only employees with user accounts
      )

      let dayMarked = 0

      for (const employee of employeesWithoutAttendance) {
        try {
          // Create an absent attendance record
          const absentRecord = new Attendance({
            employee: employee._id,
            date: dayStart,
            status: 'absent',
            workHours: 0,
            totalLoggedHours: 0,
            statusReason: 'No check-in recorded for the day',
            remarks: 'Auto-marked absent - Employee did not check in'
          })

          await absentRecord.save()

          // Send notification if requested
          if (sendNotifications && employee.user) {
            try {
              await sendPushToUser(
                employee.user._id,
                {
                  title: '❌ Marked Absent',
                  body: `You have been marked absent for ${dayStart.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} as no attendance was recorded. If this is incorrect, please raise a correction request.`,
                },
                {
                  eventType: 'markedAbsent',
                  clickAction: '/dashboard/attendance',
                  icon: '/icons/icon-192x192.png',
                  data: {
                    type: 'marked-absent',
                    date: dayStart.toISOString(),
                    note: 'Raise correction request if this is incorrect',
                  },
                }
              )
            } catch (notifyErr) {
              console.error(`Failed to send notification to ${employee._id}:`, notifyErr.message)
            }
          }

          dayMarked++
          results.marked++
        } catch (err) {
          // If duplicate key error (attendance already exists), skip
          if (err.code === 11000) {
            results.skipped++
            continue
          }
          console.error(`Failed to mark absent for employee ${employee._id}:`, err.message)
          results.errors++
        }
      }

      results.dates.push({
        date: dayStart.toISOString().split('T')[0],
        marked: dayMarked,
        onLeave: onLeaveIds.size,
        hadAttendance: employeesWithAttendance.size
      })

      results.processed++
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(`[MarkAbsent API] Processed ${results.processed} days, marked ${results.marked} employees as absent`)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} days, marked ${results.marked} employees as absent`,
      data: results
    })
  } catch (error) {
    console.error('Mark absent API error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET - Get absent marking status/info
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')
    
    if (!authHeader && !cronSecret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    let queryDate
    if (date) {
      queryDate = new Date(date)
    } else {
      // Default to yesterday
      queryDate = new Date()
      queryDate.setDate(queryDate.getDate() - 1)
    }
    queryDate.setHours(0, 0, 0, 0)

    const dayEnd = new Date(queryDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    // Get attendance stats for the date
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: queryDate, $lt: dayEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const totalEmployees = await Employee.countDocuments({ status: 'active' })
    const onLeave = await Leave.countDocuments({
      status: 'approved',
      startDate: { $lte: queryDate },
      endDate: { $gte: queryDate }
    })

    const statusCounts = attendanceStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        date: queryDate.toISOString().split('T')[0],
        totalEmployees,
        onLeave,
        attendance: statusCounts,
        unaccounted: totalEmployees - Object.values(statusCounts).reduce((a, b) => a + b, 0) - onLeave
      }
    })
  } catch (error) {
    console.error('Get absent status error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
