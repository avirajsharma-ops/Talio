/**
 * Push Notification Helper
 * Wrapper for sending push notifications to users via OneSignal
 */

import { sendOneSignalNotification } from './onesignal'
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

        // Get user
        const user = await User.findById(userId).select('email name')

        if (!user) {
            console.warn(`[PushNotification] User not found: ${userId}`)
            return { success: false, message: 'User not found' }
        }

        console.log(`[PushNotification] Sending to ${user.email}: ${title}`)

        // Send via OneSignal (with email fallback enabled)
        const result = await sendOneSignalNotification({
            userIds: [userId],
            title,
            message: body,
            data: {
                ...data,
                url,
                type
            },
            url,
            emailFallback: true
        })

        // Log if email fallback was used
        if (result?.emailFallbackUsed) {
            console.log(`📧 [PushNotification] Email fallback used for ${user.email}`)
        }

        // Save to database for in-app notifications
        await Notification.create({
            user: userId,
            title,
            message: body,
            type,
            url,
            read: false,
            deliveryStatus: {
                oneSignal: {
                    sent: result?.success || false,
                    sentAt: result?.success ? new Date() : null
                },
                email: {
                    sent: result?.emailFallbackUsed || false,
                    sentAt: result?.emailFallbackUsed ? new Date() : null
                }
            }
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
