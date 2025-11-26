/**
 * OneSignal Server-Side Utility
 * Send push notifications via OneSignal REST API
 */

import { sendEmail } from './mailer.js'
import connectDB from './mongodb.js'
import User from '../models/User.js'

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || 'd39b9d6c-e7b9-4bae-ad23-66b382b358f2'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''

/**
 * Send notification to specific users via OneSignal
 * @param {Object} options - Notification options
 * @param {Array<string>} options.userIds - Array of user IDs (external IDs or MongoDB IDs)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.url] - URL to open when notification is clicked
 * @param {Object} [options.data] - Additional data to include
 * @param {string} [options.icon] - Notification icon URL
 * @param {Array<string>} [options.tags] - Tags for segmentation
 * @param {boolean} [options.emailFallback=true] - Send email if push notification fails
 * @param {boolean} [options.usePlayerIds=false] - Use OneSignal Player IDs instead of External User IDs
 * @returns {Promise<Object>} Response from OneSignal API
 */
export async function sendOneSignalNotification({
  userIds,
  title,
  message,
  url = '/dashboard',
  data = {},
  icon = null,
  tags = [],
  emailFallback = true,
  usePlayerIds = false
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

    // If using Player IDs directly, don't need to fetch from DB
    let targetIds = userIds
    
    // If not using Player IDs, try to get Player IDs from database for better targeting
    if (!usePlayerIds) {
      try {
        await connectDB()
        const users = await User.find({ 
          _id: { $in: userIds },
          oneSignalPlayerId: { $exists: true, $ne: null }
        }).select('oneSignalPlayerId')
        
        const playerIds = users.map(u => u.oneSignalPlayerId).filter(Boolean)
        
        if (playerIds.length > 0) {
          console.log(`[OneSignal] Found ${playerIds.length} Player IDs in database, using those for better targeting`)
          targetIds = playerIds
          usePlayerIds = true
        } else {
          console.log(`[OneSignal] No Player IDs found, using External User IDs`)
        }
      } catch (dbError) {
        console.warn('[OneSignal] Could not fetch Player IDs from database, using External User IDs:', dbError.message)
      }
    }

    // Prepare notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      // Use either Player IDs or External User IDs
      ...(usePlayerIds 
        ? { include_player_ids: targetIds } 
        : { include_external_user_ids: targetIds }
      ),
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
      ios_sound: 'default',
      
      // Android specific
      android_channel_id: 'talio-hrms-notifications',
      android_accent_color: 'FF0000FF',
      android_visibility: 1,
      android_sound: 'default',
      small_icon: 'ic_stat_onesignal_default',
      large_icon: icon || `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'}/icons/icon-192x192.png`,
      
      // Priority (10 = high priority for immediate delivery)
      priority: 10,
      
      // TTL (time to live) - 1 day
      ttl: 86400,
      
      // Delivery settings
      content_available: true,
      mutable_content: true
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
      console.error('[OneSignal] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        result,
        payload: {
          ...payload,
          // Don't log the full API key
          app_id: ONESIGNAL_APP_ID
        }
      })
      return {
        success: false,
        message: result.errors ? result.errors.join(', ') : 'Failed to send notification',
        error: result,
        details: {
          status: response.status,
          userIds: userIds,
          recipientCount: userIds.length
        }
      }
    }

    console.log('[OneSignal] Notification sent successfully:', {
      id: result.id,
      recipients: result.recipients,
      errors: result.errors,
      warnings: result.warnings,
      userIds: userIds,
      recipientCount: userIds.length
    })

    // Check if there were any errors even on success
    if (result.errors && result.errors.length > 0) {
      console.warn('[OneSignal] Notification sent but with errors:', result.errors)
    }

    return {
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Notification sent successfully',
      warnings: result.warnings,
      errors: result.errors,
      emailFallbackUsed: false
    }
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error)
    
    // Email fallback for failed push notifications
    let emailFallbackSuccess = false
    if (emailFallback && userIds && userIds.length > 0) {
      console.log('[OneSignal] Attempting email fallback for failed push notification...')
      emailFallbackSuccess = await sendEmailFallback(userIds, title, message, url)
    }
    
    return {
      success: false,
      message: error.message,
      error: error,
      emailFallbackUsed: emailFallbackSuccess,
      emailFallbackMessage: emailFallbackSuccess 
        ? 'Email notification sent as fallback' 
        : 'Email fallback also failed or disabled'
    }
  }
}

/**
 * Send email fallback when push notification fails
 * @private
 */
async function sendEmailFallback(userIds, title, message, url) {
  try {
    await connectDB()
    
    // Get users with valid email addresses
    const users = await User.find({ 
      _id: { $in: userIds },
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email firstName lastName')

    if (!users || users.length === 0) {
      console.warn('[OneSignal] No users with email found for fallback')
      return false
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Talio HRMS'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'
    const fullUrl = url?.startsWith('http') ? url : `${appUrl}${url}`

    let emailsSent = 0
    for (const user of users) {
      try {
        const userName = user.firstName || user.lastName 
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
          : 'there'

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .notification-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
              .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔔 ${appName}</h1>
              </div>
              <div class="content">
                <p>Hi ${userName},</p>
                <div class="notification-box">
                  <h2 style="margin-top: 0; color: #667eea;">${title}</h2>
                  <p style="margin: 0;">${message}</p>
                </div>
                ${url !== '/dashboard' ? `<a href="${fullUrl}" class="button">View Details</a>` : ''}
                <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                  This is a notification from ${appName}. You received this email because push notifications could not be delivered to your device.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `

        const text = `
Hi ${userName},

${title}

${message}

${url !== '/dashboard' ? `View details: ${fullUrl}` : ''}

---
This is a notification from ${appName}.
© ${new Date().getFullYear()} ${appName}
        `.trim()

        await sendEmail({
          to: user.email,
          subject: `🔔 ${title}`,
          text,
          html
        })

        emailsSent++
        console.log(`[OneSignal] Email fallback sent to ${user.email}`)
      } catch (emailError) {
        console.error(`[OneSignal] Failed to send email fallback to ${user.email}:`, emailError.message)
      }
    }

    if (emailsSent > 0) {
      console.log(`[OneSignal] ✅ Email fallback: ${emailsSent}/${users.length} emails sent`)
      return true
    } else {
      console.warn('[OneSignal] ❌ Email fallback: No emails sent')
      return false
    }
  } catch (error) {
    console.error('[OneSignal] Email fallback error:', error)
    return false
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

