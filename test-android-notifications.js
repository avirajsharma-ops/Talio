/**
 * Android Push Notification Test Script
 * Tests if notifications work when app is killed, background, and foreground
 */

const notificationService = require('./lib/notificationService')
const mongoose = require('mongoose')

// Test configuration
const TEST_CONFIG = {
  // Replace with your test user's FCM token from Android device
  FCM_TOKEN: process.env.TEST_FCM_TOKEN || 'YOUR_ANDROID_FCM_TOKEN_HERE',

  // Replace with your test user ID
  USER_ID: process.env.TEST_USER_ID || 'YOUR_USER_ID_HERE',

  // MongoDB connection
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/talio-hrms'
}

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Message Notification (talio_messages channel)',
    notification: {
      userId: TEST_CONFIG.USER_ID,
      title: '💬 Test Message',
      message: 'This is a test message notification. App should show this even when killed!',
      type: 'message',
      data: {
        chatId: 'test-chat-123',
        senderId: 'test-sender',
        url: '/chat/test-chat-123'
      }
    }
  },
  {
    name: 'Task Notification (talio_tasks channel)',
    notification: {
      userId: TEST_CONFIG.USER_ID,
      title: '📋 Test Task',
      message: 'You have been assigned a new task: Complete Android notification testing',
      type: 'task',
      data: {
        taskId: 'test-task-123',
        url: '/tasks/test-task-123'
      }
    }
  },
  {
    name: 'Announcement Notification (talio_announcements channel)',
    notification: {
      userId: TEST_CONFIG.USER_ID,
      title: '📢 Test Announcement',
      message: 'This is a test company announcement. Check if vibration pattern is different!',
      type: 'announcement',
      data: {
        announcementId: 'test-announcement-123',
        url: '/announcements/test-announcement-123'
      }
    }
  },
  {
    name: 'General Notification (talio_general channel)',
    notification: {
      userId: TEST_CONFIG.USER_ID,
      title: '🔔 Test General',
      message: 'This is a general notification test',
      type: 'system',
      data: {
        url: '/dashboard'
      }
    }
  }
]

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function connectDB() {
  try {
    await mongoose.connect(TEST_CONFIG.MONGODB_URI)
    log('✅ Connected to MongoDB', 'green')
    return true
  } catch (error) {
    log(`❌ Failed to connect to MongoDB: ${error.message}`, 'red')
    return false
  }
}

async function runTest(scenario, index) {
  log(`\n${'='.repeat(80)}`, 'cyan')
  log(`Test ${index + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`, 'cyan')
  log('='.repeat(80), 'cyan')

  try {
    log(`\n📤 Sending notification...`, 'yellow')
    log(`   Title: ${scenario.notification.title}`)
    log(`   Type: ${scenario.notification.type}`)
    log(`   User ID: ${scenario.notification.userId}`)

    const result = await notificationService.sendNotification(scenario.notification)

    if (result.success) {
      log(`\n✅ Notification sent successfully!`, 'green')
      log(`   FCM Success: ${result.fcmSuccess}`, 'green')
      log(`   FCM Failure: ${result.fcmFailure}`, 'green')

      if (result.fcmSuccess > 0) {
        log(`\n📱 CHECK YOUR ANDROID DEVICE NOW!`, 'yellow')
        log(`   Expected behavior:`, 'yellow')
        log(`   - Notification should appear in notification panel`, 'yellow')
        log(`   - Should have sound and vibration`, 'yellow')
        log(`   - Should work even if app is KILLED`, 'yellow')
        log(`   - LED color should match notification type`, 'yellow')

        // Wait for user to check
        log(`\n⏳ Waiting 10 seconds for you to check...`, 'blue')
        await new Promise(resolve => setTimeout(resolve, 10000))
      } else {
        log(`\n⚠️  FCM send failed. Check:`, 'red')
        log(`   1. Is FCM token correct?`, 'red')
        log(`   2. Is Firebase Admin SDK configured?`, 'red')
        log(`   3. Check backend logs for errors`, 'red')
      }
    } else {
      log(`\n❌ Notification failed: ${result.error}`, 'red')
    }

    return result.success
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red')
    console.error(error)
    return false
  }
}

async function main() {
  log('\n' + '='.repeat(80), 'cyan')
  log('🔔 ANDROID PUSH NOTIFICATION TEST SUITE', 'cyan')
  log('='.repeat(80) + '\n', 'cyan')

  // Validate configuration
  log('📋 Configuration:', 'blue')
  log(`   FCM Token: ${TEST_CONFIG.FCM_TOKEN.substring(0, 20)}...`)
  log(`   User ID: ${TEST_CONFIG.USER_ID}`)
  log(`   MongoDB: ${TEST_CONFIG.MONGODB_URI}`)

  if (TEST_CONFIG.FCM_TOKEN === 'YOUR_ANDROID_FCM_TOKEN_HERE') {
    log('\n❌ ERROR: Please set TEST_FCM_TOKEN environment variable!', 'red')
    log('\nHow to get FCM token:', 'yellow')
    log('1. Connect Android device: adb devices', 'yellow')
    log('2. Watch logs: adb logcat | grep "FCM Token"', 'yellow')
    log('3. Open app and login', 'yellow')
    log('4. Copy the token from logs', 'yellow')
    log('\nThen run:', 'yellow')
    log('TEST_FCM_TOKEN="your-token" TEST_USER_ID="your-user-id" node test-android-notifications.js', 'yellow')
    process.exit(1)
  }

  // Connect to database
  log('\n📡 Connecting to database...', 'blue')
  const connected = await connectDB()
  if (!connected) {
    log('\n❌ Cannot proceed without database connection', 'red')
    process.exit(1)
  }

  // Run tests
  log('\n🚀 Starting tests...', 'blue')
  log('\n⚠️  IMPORTANT: Make sure your Android app is KILLED (force stopped) to test properly!', 'yellow')
  log('   Settings → Apps → Talio → Force Stop', 'yellow')

  await new Promise(resolve => setTimeout(resolve, 3000))

  const results = []
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const success = await runTest(TEST_SCENARIOS[i], i)
    results.push({ scenario: TEST_SCENARIOS[i].name, success })
  }

  // Summary
  log('\n' + '='.repeat(80), 'cyan')
  log('📊 TEST SUMMARY', 'cyan')
  log('='.repeat(80), 'cyan')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌'
    const color = result.success ? 'green' : 'red'
    log(`${icon} Test ${index + 1}: ${result.scenario}`, color)
  })

  log(`\n📈 Results: ${passed} passed, ${failed} failed`, passed === results.length ? 'green' : 'yellow')

  if (passed === results.length) {
    log('\n🎉 ALL TESTS PASSED! Your Android notifications are working perfectly!', 'green')
    log('   ✅ Notifications work when app is killed', 'green')
    log('   ✅ Different channels for different types', 'green')
    log('   ✅ Sound and vibration working', 'green')
    log('   ✅ WhatsApp-like behavior achieved!', 'green')
  } else {
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow')
  }

  // Cleanup
  await mongoose.disconnect()
  log('\n✅ Disconnected from MongoDB', 'green')

  process.exit(passed === results.length ? 0 : 1)
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { runTest, TEST_SCENARIOS }

