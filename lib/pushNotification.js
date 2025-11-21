/**
 * Push Notification Helper
 * Wrapper for sending push notifications to users
 */

import { sendFCMNotification } from './firebaseAdmin'
import User from '@/models/User'
import Notification from '@/models/Notification'

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {Object} options - Additional options
 * @param {Object} options.data - Custom data payload
 * @param {string} options.url - URL to navigate to when clicked
 * @param {string} options.icon - Notification icon URL
 * @param {string} options.type - Notification type (e.g., 'login', 'leave', 'task', etc.)
 * @returns {Promise<Object>} Result object
 */
export async function sendPushToUser(userId, title, body, options = {}) {
    try {
        const { data = {}, url = '/dashboard', icon = null, type = 'general' } = options

        // Get user's FCM tokens
        const user = await User.findById(userId).select('fcmTokens email name')

        if (!user) {
            console.warn(`[PushNotification] User not found: ${userId}`)
            return { success: false, message: 'User not found' }
        }

        // Extract FCM token strings
        const tokens = (user.fcmTokens || []).map(t => t.token).filter(Boolean)

        if (tokens.length === 0) {
            console.warn(`[PushNotification] No FCM tokens for user: ${user.email}`)

            // Still save to database for in-app notifications
            await Notification.create({
                user: userId,
                title,
                message: body,
                type,
                url,
                read: false
            })

            return { success: false, message: 'No FCM tokens found' }
        }

        console.log(`[PushNotification] Sending to ${user.email}: ${title}`)

        // Send FCM notification
        const result = await sendFCMNotification({
            tokens,
            title,
            body,
            data: {
                ...data,
                url,
                type
            },
            imageUrl: icon
        })

        // Save to database for in-app notifications
        await Notification.create({
            user: userId,
            title,
            message: body,
            type,
            url,
            read: false
        })

        return result

    } catch (error) {
        console.error('[PushNotification] Error:', error)
        return {
            success: false,
            message: error.message,
            successCount: 0,
            failureCount: 1
        }
    }
}

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {Object} options - Additional options (same as sendPushToUser)
 * @returns {Promise<Object>} Result object with counts
 */
export async function sendPushToUsers(userIds, title, body, options = {}) {
    try {
        const results = await Promise.allSettled(
            userIds.map(userId => sendPushToUser(userId, title, body, options))
        )

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failureCount = results.length - successCount

        return {
            success: successCount > 0,
            successCount,
            failureCount,
            totalUsers: userIds.length
        }

    } catch (error) {
        console.error('[PushNotification] Error sending to multiple users:', error)
        return {
            success: false,
            message: error.message,
            successCount: 0,
            failureCount: userIds.length
        }
    }
}
