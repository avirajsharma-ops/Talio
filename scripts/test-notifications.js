// Test script to debug notification processing
require('dotenv').config();
const mongoose = require('mongoose');

async function testNotificationProcessing() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const now = new Date();
        console.log('📅 Current time:', now.toISOString());
        console.log('');

        // Define schemas
        const ScheduledNotificationSchema = new mongoose.Schema({}, { strict: false });
        const RecurringNotificationSchema = new mongoose.Schema({}, { strict: false });
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const NotificationSchema = new mongoose.Schema({}, { strict: false });

        const ScheduledNotification = mongoose.models.ScheduledNotification ||
            mongoose.model('ScheduledNotification', ScheduledNotificationSchema);
        const RecurringNotification = mongoose.models.RecurringNotification ||
            mongoose.model('RecurringNotification', RecurringNotificationSchema);
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

        // ========== CHECK SCHEDULED NOTIFICATIONS ==========
        console.log('=== SCHEDULED NOTIFICATIONS ===');

        const pendingScheduled = await ScheduledNotification.find({
            status: 'pending',
            scheduledFor: { $lte: now }
        });

        console.log(`Found ${pendingScheduled.length} pending scheduled notifications due now`);

        for (const notif of pendingScheduled) {
            console.log(`\n📬 Processing: "${notif.title}"`);
            console.log(`   Scheduled for: ${notif.scheduledFor}`);
            console.log(`   Target type: ${notif.targetType}`);

            // Get target users
            let userIds = [];
            if (notif.targetType === 'all') {
                const users = await User.find({}).select('_id');
                userIds = users.map(u => u._id.toString());
            }

            console.log(`   Target users: ${userIds.length}`);

            if (userIds.length > 0) {
                // Create notification records
                const notificationRecords = userIds.map(userId => ({
                    user: userId,
                    title: notif.title,
                    message: notif.message,
                    url: notif.url || '/dashboard',
                    type: 'custom',
                    priority: 'medium',
                    createdAt: new Date()
                }));

                // Save notifications
                await Notification.insertMany(notificationRecords);
                console.log(`   ✅ Created ${notificationRecords.length} notification records`);

                // Update scheduled notification status
                notif.status = 'sent';
                notif.sentAt = new Date();
                notif.recipientCount = userIds.length;
                await notif.save();
                console.log(`   ✅ Status updated to SENT`);
            } else {
                notif.status = 'failed';
                notif.error = 'No users found';
                await notif.save();
                console.log(`   ❌ Failed - No users found`);
            }
        }

        // ========== CHECK RECURRING NOTIFICATIONS ==========
        console.log('\n\n=== RECURRING NOTIFICATIONS ===');

        const dueRecurring = await RecurringNotification.find({
            isActive: true,
            nextScheduledAt: { $lte: now }
        });

        console.log(`Found ${dueRecurring.length} recurring notifications due now`);

        for (const notif of dueRecurring) {
            console.log(`\n🔄 Processing: "${notif.title}"`);
            console.log(`   Frequency: ${notif.frequency}`);
            console.log(`   Next scheduled: ${notif.nextScheduledAt}`);
            console.log(`   Target type: ${notif.targetType}`);

            // Get target users
            let userIds = [];
            if (notif.targetType === 'all') {
                const users = await User.find({}).select('_id');
                userIds = users.map(u => u._id.toString());
            }

            console.log(`   Target users: ${userIds.length}`);

            if (userIds.length > 0) {
                // Create notification records
                const notificationRecords = userIds.map(userId => ({
                    user: userId,
                    title: notif.title,
                    message: notif.message,
                    url: notif.url || '/dashboard',
                    type: 'custom',
                    priority: 'medium',
                    createdAt: new Date()
                }));

                // Save notifications
                await Notification.insertMany(notificationRecords);
                console.log(`   ✅ Created ${notificationRecords.length} notification records`);

                // Update recurring notification
                notif.lastSentAt = new Date();
                notif.totalSent = (notif.totalSent || 0) + 1;

                // Calculate next schedule
                const nextDate = calculateNextSchedule(notif);
                notif.nextScheduledAt = nextDate;

                await notif.save();
                console.log(`   ✅ Updated - Next scheduled: ${nextDate}`);
            }
        }

        console.log('\n\n✅ Test complete!');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function calculateNextSchedule(notif) {
    const now = new Date();
    let nextDate = new Date(now);

    switch (notif.frequency) {
        case 'daily':
            if (notif.dailyTime) {
                const [hours, minutes] = notif.dailyTime.split(':');
                nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                if (nextDate <= now) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
            } else {
                nextDate.setDate(nextDate.getDate() + 1);
            }
            break;

        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;

        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;

        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

testNotificationProcessing();
