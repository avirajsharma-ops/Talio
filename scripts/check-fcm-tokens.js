/**
 * Check FCM Tokens in Database
 * This script checks all users and displays their FCM tokens
 */

const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')
    } catch (error) {
        console.error('❌ MongoDB connection error:', error)
        process.exit(1)
    }
}

const checkFCMTokens = async () => {
    try {
        console.log('Connecting to MongoDB...')
        await connectDB()

        // Get User model
        const User = mongoose.model('User') || require('../models/User')

        console.log('\n📊 Checking FCM tokens in database...\n')

        const users = await User.find({}, 'name email fcmTokens')

        let totalUsers = 0
        let usersWithTokens = 0
        let totalTokens = 0

        users.forEach(user => {
            totalUsers++
            const tokenCount = user.fcmTokens?.length || 0

            if (tokenCount > 0) {
                usersWithTokens++
                totalTokens += tokenCount

                console.log(`✅ ${user.name} (${user.email})`)
                console.log(`   Tokens: ${tokenCount}`)
                user.fcmTokens.forEach((tokenObj, index) => {
                    const tokenPreview = tokenObj.token.substring(0, 30) + '...'
                    const device = tokenObj.device || 'unknown'
                    const createdAt = tokenObj.createdAt ? new Date(tokenObj.createdAt).toLocaleString() : 'N/A'
                    const lastUsed = tokenObj.lastUsed ? new Date(tokenObj.lastUsed).toLocaleString() : 'N/A'

                    console.log(`   [${index + 1}] ${tokenPreview}`)
                    console.log(`       Device: ${device}`)
                    console.log(`       Created: ${createdAt}`)
                    console.log(`       Last Used: ${lastUsed}`)
                })
                console.log('')
            } else {
                console.log(`❌ ${user.name} (${user.email})`)
                console.log(`   No FCM tokens\n`)
            }
        })

        console.log('━'.repeat(60))
        console.log(`\n📈 Summary:`)
        console.log(`   Total users: ${totalUsers}`)
        console.log(`   Users with tokens: ${usersWithTokens}`)
        console.log(`   Total FCM tokens: ${totalTokens}`)
        console.log(`   Average tokens per user: ${(totalTokens / totalUsers).toFixed(2)}`)
        console.log('')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await mongoose.disconnect()
        console.log('Disconnected from MongoDB')
        process.exit(0)
    }
}

checkFCMTokens()
