/**
 * Script to clear all old FCM tokens from the database
 * Run this when you change Firebase projects to remove invalid tokens
 */

const mongoose = require('mongoose')
require('dotenv').config()

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms'

async function clearFCMTokens() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🧹 CLEARING OLD FCM TOKENS')
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

    // Count users with FCM tokens
    const usersWithTokens = await User.countDocuments({ 'fcmTokens.0': { $exists: true } })
    console.log(`📊 Found ${usersWithTokens} users with FCM tokens\n`)

    if (usersWithTokens === 0) {
      console.log('✅ No FCM tokens to clear!')
      await mongoose.disconnect()
      return
    }

    // Get all users with tokens
    const users = await User.find({ 'fcmTokens.0': { $exists: true } })
    
    console.log('👥 Users with FCM tokens:')
    console.log('-'.repeat(80))
    users.forEach(user => {
      console.log(`   ${user.name} (${user.email})`)
      console.log(`   Tokens: ${user.fcmTokens.length}`)
      user.fcmTokens.forEach((tokenObj, idx) => {
        console.log(`      ${idx + 1}. ${tokenObj.token.substring(0, 30)}... (${tokenObj.device || 'unknown'})`)
      })
      console.log('')
    })

    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL FCM tokens from the database!')
    console.log('   Users will need to logout and login again to generate new tokens.\n')

    // Clear all FCM tokens
    console.log('🧹 Clearing all FCM tokens...')
    const result = await User.updateMany(
      { 'fcmTokens.0': { $exists: true } },
      { $set: { fcmTokens: [] } }
    )

    console.log(`✅ Cleared FCM tokens from ${result.modifiedCount} users\n`)

    // Verify
    const remainingTokens = await User.countDocuments({ 'fcmTokens.0': { $exists: true } })
    console.log(`📊 Remaining users with tokens: ${remainingTokens}`)

    if (remainingTokens === 0) {
      console.log('\n' + '='.repeat(80))
      console.log('✅ SUCCESS! All old FCM tokens have been cleared!')
      console.log('='.repeat(80))
      console.log('\n📱 NEXT STEPS:')
      console.log('   1. Open the Talio app on your Android device')
      console.log('   2. Logout from the app')
      console.log('   3. Login again')
      console.log('   4. New FCM tokens will be generated automatically')
      console.log('   5. Test notifications: http://localhost:3000/test-notifications.html')
      console.log('\n' + '='.repeat(80) + '\n')
    } else {
      console.log('\n⚠️  WARNING: Some tokens still remain. Please check manually.')
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
clearFCMTokens()

