/**
 * OneSignal Server-Side Utility
 * Send push notifications via OneSignal REST API
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || 'f7b9d1a1-5095-4be8-8a74-2af13058e7b2'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''

/**
 * Send notification to specific users via OneSignal
 * @param {Object} options - Notification options
 * @param {Array<string>} options.userIds - Array of user IDs (external IDs)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.url] - URL to open when notification is clicked
 * @param {Object} [options.data] - Additional data to include
 * @param {string} [options.icon] - Notification icon URL
 * @param {Array<string>} [options.tags] - Tags for segmentation
 * @returns {Promise<Object>} Response from OneSignal API
 */
export async function sendOneSignalNotification({
  userIds,
  title,
  message,
  url = '/dashboard',
  data = {},
  icon = null,
  tags = []
}) {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      console.warn('[OneSignal] REST API key not configured. Skipping notification.')
      return { success: false, message: 'OneSignal REST API key not configured' }
    }

    if (!userIds || userIds.length === 0) {
      console.warn('[OneSignal] No user IDs provided')
      return { success: false, message: 'No user IDs provided' }
    }

    console.log(`[OneSignal] Sending notification to ${userIds.length} user(s): ${title}`)

    // Prepare notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: userIds,
      headings: { en: title },
      contents: { en: message },
      data: {
        url,
        ...data
      },
      web_url: url,
      chrome_web_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      firefox_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      chrome_web_badge: `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-96x96.png`,
      
      // iOS specific
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      
      // Android specific
      android_channel_id: 'talio-hrms-notifications',
      
      // Priority
      priority: 10,
      
      // TTL (time to live) - 1 day
      ttl: 86400
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      payload.tags = tags
    }

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[OneSignal] API Error:', result)
      return {
        success: false,
        message: result.errors ? result.errors.join(', ') : 'Failed to send notification',
        error: result
      }
    }

    console.log('[OneSignal] Notification sent successfully:', result)
    return {
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Notification sent successfully'
    }
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Send notification to all users
 */
export async function sendOneSignalBroadcast({
  title,
  message,
  url = '/dashboard',
  data = {},
  icon = null,
  segments = ['All']
}) {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      console.warn('[OneSignal] REST API key not configured. Skipping notification.')
      return { success: false, message: 'OneSignal REST API key not configured' }
    }

    console.log(`[OneSignal] Sending broadcast notification: ${title}`)

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: segments,
      headings: { en: title },
      contents: { en: message },
      data: {
        url,
        ...data
      },
      web_url: url,
      chrome_web_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      firefox_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      chrome_web_badge: `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-96x96.png`,
      priority: 10,
      ttl: 86400
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[OneSignal] API Error:', result)
      return {
        success: false,
        message: result.errors ? result.errors.join(', ') : 'Failed to send notification',
        error: result
      }
    }

    console.log('[OneSignal] Broadcast sent successfully:', result)
    return {
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Broadcast sent successfully'
    }
  } catch (error) {
    console.error('[OneSignal] Error sending broadcast:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Send notification with filters
 */
export async function sendOneSignalWithFilters({
  title,
  message,
  filters,
  url = '/dashboard',
  data = {},
  icon = null
}) {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      console.warn('[OneSignal] REST API key not configured. Skipping notification.')
      return { success: false, message: 'OneSignal REST API key not configured' }
    }

    console.log(`[OneSignal] Sending filtered notification: ${title}`)

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters: filters,
      headings: { en: title },
      contents: { en: message },
      data: {
        url,
        ...data
      },
      web_url: url,
      chrome_web_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      firefox_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      chrome_web_badge: `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-96x96.png`,
      priority: 10,
      ttl: 86400
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[OneSignal] API Error:', result)
      return {
        success: false,
        message: result.errors ? result.errors.join(', ') : 'Failed to send notification',
        error: result
      }
    }

    console.log('[OneSignal] Filtered notification sent successfully:', result)
    return {
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Notification sent successfully'
    }
  } catch (error) {
    console.error('[OneSignal] Error sending filtered notification:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelOneSignalNotification(notificationId) {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      return { success: false, message: 'OneSignal REST API key not configured' }
    }

    const response = await fetch(`https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to cancel notification',
        error: result
      }
    }

    return {
      success: true,
      message: 'Notification cancelled successfully'
    }
  } catch (error) {
    console.error('[OneSignal] Error cancelling notification:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

export default {
  sendOneSignalNotification,
  sendOneSignalBroadcast,
  sendOneSignalWithFilters,
  cancelOneSignalNotification
}

