/**
 * Script to clear ONLY web FCM tokens from the database
 * This keeps Android/iOS tokens intact
 */

const mongoose = require('mongoose')
require('dotenv').config()

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms'

async function clearWebFCMTokens() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🧹 CLEARING WEB FCM TOKENS ONLY')
    console.log('='.repeat(80) + '\n')

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      fcmTokens: [{
        token: String,
        device: String,
        createdAt: Date
      }]
    }))

    // Find all users
    const users = await User.find({})
    
    console.log(`📊 Total users: ${users.length}\n`)

    let totalWebTokens = 0
    let totalAndroidTokens = 0
    let usersModified = 0

    console.log('👥 Analyzing FCM tokens:')
    console.log('-'.repeat(80))

    for (const user of users) {
      if (!user.fcmTokens || user.fcmTokens.length === 0) continue

      const webTokens = user.fcmTokens.filter(t => t.device === 'web')
      const androidTokens = user.fcmTokens.filter(t => t.device === 'android')
      const iosTokens = user.fcmTokens.filter(t => t.device === 'ios')

      if (webTokens.length > 0) {
        console.log(`\n   ${user.email}`)
        console.log(`   Web tokens: ${webTokens.length}`)
        console.log(`   Android tokens: ${androidTokens.length}`)
        console.log(`   iOS tokens: ${iosTokens.length}`)

        totalWebTokens += webTokens.length
        totalAndroidTokens += androidTokens.length

        // Remove web tokens, keep Android/iOS
        user.fcmTokens = [...androidTokens, ...iosTokens]
        await user.save()
        usersModified++

        console.log(`   ✅ Removed ${webTokens.length} web token(s)`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total web tokens removed: ${totalWebTokens}`)
    console.log(`Total Android tokens kept: ${totalAndroidTokens}`)
    console.log(`Users modified: ${usersModified}`)
    console.log('='.repeat(80))

    if (totalWebTokens > 0) {
      console.log('\n✅ SUCCESS! Web FCM tokens have been cleared!')
      console.log('\n📱 IMPORTANT:')
      console.log('   The web tokens were causing the "SenderId mismatch" error.')
      console.log('   Web push notifications use a different mechanism than Android FCM.')
      console.log('\n🔧 NEXT STEPS:')
      console.log('   1. Test notifications again using: http://localhost:3000/test-notifications.html')
      console.log('   2. If you still see errors, make sure you have logged in on the Android app')
      console.log('   3. Android app should generate tokens with device: "android"')
      console.log('')
    } else {
      console.log('\n✅ No web tokens found!')
      console.log('\n⚠️  If you\'re still getting errors, the issue might be:')
      console.log('   1. No Android tokens in database (need to login on Android app)')
      console.log('   2. Android tokens are from old Firebase project (need to rebuild app)')
      console.log('')
    }

    // Disconnect
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
clearWebFCMTokens()

