/**
 * Create a test scheduled notification for 2 minutes in the future
 */
require('dotenv').config()
const mongoose = require('mongoose')

async function createTest() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const ScheduledNotification = require('../models/ScheduledNotification').default
    const User = require('../models/User').default

    // Get a user to target
    const user = await User.findOne({ isActive: { $ne: false } })
    if (!user) {
        console.log('❌ No users found!')
        process.exit(1)
    }

    // Schedule for 2 minutes from now
    const scheduledFor = new Date(Date.now() + 2 * 60 * 1000)

    const notification = await ScheduledNotification.create({
        title: 'Test Notification',
        message: 'This is a test scheduled notification created at ' + new Date().toISOString(),
        targetType: 'all',
        scheduledFor: scheduledFor,
        status: 'pending',
        createdBy: user._id
    })

    console.log('✅ Created scheduled notification:')
    console.log(`   ID: ${notification._id}`)
    console.log(`   Title: ${notification.title}`)
    console.log(`   Scheduled for: ${scheduledFor}`)
    console.log(`   Status: ${notification.status}`)
    console.log(`\n⏰ The notification should be sent in ~2 minutes`)
    console.log(`   Current time: ${new Date()}`)

    await mongoose.disconnect()
}

createTest().catch(err => {
    console.error('Error:', err)
    process.exit(1)
})
