import { sendPushNotification, sendPushNotificationToMultiple } from './firebase-admin'
import User from '@/models/User'
import CompanySettings from '@/models/CompanySettings'

/**
 * Send push notification to a single user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} options - Additional options
 * @param {string} options.icon - Notification icon URL
 * @param {string} options.clickAction - URL to open when notification is clicked
 * @param {Object} options.data - Additional data to send with notification
 * @param {string} options.eventType - Event type (e.g., 'login', 'taskAssigned')
 * @returns {Promise<Object>} Result object
 */
export async function sendPushToUser(userId, notification, options = {}) {
  try {
    // Check if push notifications are enabled globally
    const settings = await CompanySettings.findOne()
    if (!settings || settings.notifications?.pushNotifications === false) {
      console.log('[Push] Push notifications are disabled globally')
      return { success: false, reason: 'disabled_globally' }
    }

    // Check if specific event type is enabled (if provided)
    if (options.eventType && settings.notifications?.pushEvents) {
      const eventEnabled = settings.notifications.pushEvents[options.eventType]
      if (eventEnabled === false) {
        console.log(`[Push] Push notifications disabled for event: ${options.eventType}`)
        return { success: false, reason: 'event_disabled' }
      }
    }

    // Get user and their FCM tokens
    const user = await User.findById(userId)
    if (!user) {
      console.error('[Push] User not found:', userId)
      return { success: false, reason: 'user_not_found' }
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      console.log('[Push] No FCM tokens found for user:', user.email)
      return { success: false, reason: 'no_tokens' }
    }

    // Get the most recent token
    const latestToken = user.fcmTokens[user.fcmTokens.length - 1]
    if (!latestToken || !latestToken.token) {
      console.log('[Push] Invalid FCM token for user:', user.email)
      return { success: false, reason: 'invalid_token' }
    }

    // Prepare notification data
    const notificationData = {
      clickAction: options.clickAction || '/dashboard',
      eventType: options.eventType || 'general',
      timestamp: new Date().toISOString(),
      ...options.data,
    }

    // Send notification
    const result = await sendPushNotification(
      latestToken.token,
      {
        title: notification.title,
        body: notification.body,
        icon: options.icon || '/icon-192x192.png',
      },
      notificationData
    )

    if (result.success) {
      console.log(`[Push] Notification sent to ${user.email}`)
    } else {
      console.error(`[Push] Failed to send notification to ${user.email}:`, result.error)
    }

    return result
  } catch (error) {
    console.error('[Push] Error sending notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {Object} notification - Notification payload
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object
 */
export async function sendPushToMultipleUsers(userIds, notification, options = {}) {
  try {
    // Check if push notifications are enabled globally
    const settings = await CompanySettings.findOne()
    if (!settings || settings.notifications?.pushNotifications === false) {
      console.log('[Push] Push notifications are disabled globally')
      return { success: false, reason: 'disabled_globally' }
    }

    // Check if specific event type is enabled (if provided)
    if (options.eventType && settings.notifications?.pushEvents) {
      const eventEnabled = settings.notifications.pushEvents[options.eventType]
      if (eventEnabled === false) {
        console.log(`[Push] Push notifications disabled for event: ${options.eventType}`)
        return { success: false, reason: 'event_disabled' }
      }
    }

    // Get all users and collect their FCM tokens
    const users = await User.find({ _id: { $in: userIds } })
    const fcmTokens = []
    const userEmails = []

    users.forEach((user) => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        const latestToken = user.fcmTokens[user.fcmTokens.length - 1]
        if (latestToken && latestToken.token) {
          fcmTokens.push(latestToken.token)
          userEmails.push(user.email)
        }
      }
    })

    if (fcmTokens.length === 0) {
      console.log('[Push] No FCM tokens found for any users')
      return { success: false, reason: 'no_tokens' }
    }

    // Prepare notification data
    const notificationData = {
      clickAction: options.clickAction || '/dashboard',
      eventType: options.eventType || 'general',
      timestamp: new Date().toISOString(),
      ...options.data,
    }

    // Send notification
    const result = await sendPushNotificationToMultiple(
      fcmTokens,
      {
        title: notification.title,
        body: notification.body,
        icon: options.icon || '/icon-192x192.png',
      },
      notificationData
    )

    console.log(`[Push] Batch notification sent to ${fcmTokens.length} device(s)`, {
      successCount: result.successCount,
      failureCount: result.failureCount,
    })

    return result
  } catch (error) {
    console.error('[Push] Error sending batch notification:', error)
    return { success: false, error: error.message }
  }
}

