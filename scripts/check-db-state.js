/**
 * Check notification database state
 */
require('dotenv').config()
const mongoose = require('mongoose')

async function check() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const ScheduledNotification = require('../models/ScheduledNotification').default
    const RecurringNotification = require('../models/RecurringNotification').default
    const Notification = require('../models/Notification').default

    // Check scheduled notifications
    const scheduled = await ScheduledNotification.find({}).lean()
    console.log('=== SCHEDULED NOTIFICATIONS ===')
    scheduled.forEach(s => {
        console.log(`- "${s.title}": status=${s.status}, scheduledFor=${s.scheduledFor}, sentAt=${s.sentAt || 'N/A'}`)
    })

    // Check recurring notifications
    const recurring = await RecurringNotification.find({}).lean()
    console.log('\n=== RECURRING NOTIFICATIONS ===')
    recurring.forEach(r => {
        console.log(`- "${r.title}": isActive=${r.isActive}, totalSent=${r.totalSent || 0}, lastSentAt=${r.lastSentAt || 'N/A'}, nextScheduledAt=${r.nextScheduledAt}`)
    })

    // Check recently created notifications by type
    const notifs = await Notification.find({
        type: { $in: ['scheduled', 'recurring'] }
    }).sort({ createdAt: -1 }).limit(20).lean()

    console.log('\n=== CREATED NOTIFICATIONS (scheduled/recurring type) ===')
    console.log(`Total found: ${notifs.length}`)
    notifs.forEach(n => {
        console.log(`- "${n.title}": type=${n.type}, createdAt=${n.createdAt}, user=${n.user}`)
    })

    // Also check ALL recent notifications
    const allNotifs = await Notification.find({}).sort({ createdAt: -1 }).limit(10).lean()
    console.log('\n=== MOST RECENT NOTIFICATIONS (any type) ===')
    allNotifs.forEach(n => {
        console.log(`- "${n.title}": type=${n.type}, createdAt=${n.createdAt}`)
    })

    await mongoose.disconnect()
    console.log('\n✅ Done!')
}

check().catch(err => {
    console.error('Error:', err)
    process.exit(1)
})
