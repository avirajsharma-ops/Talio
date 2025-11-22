/**
 * FCM Helper for Android WebView Integration
 * Handles token registration and device communication
 */

/**
 * Check if running in Android WebView with FCM support
 */
export function isFCMSupported() {
    return typeof window !== 'undefined' &&
        typeof window.AndroidFCM !== 'undefined'
}

/**
 * Register FCM token with backend
 * @param {string} userId - User ID
 * @param {string} token - JWT token for authentication
 */
export async function registerFCMToken(userId, token) {
    if (!isFCMSupported()) {
        console.log('FCM not supported in this environment')
        return { success: false, message: 'FCM not supported' }
    }

    try {
        // Request token from Android
        window.AndroidFCM.registerToken(userId)

        // Android will call window.handleFCMToken(fcmToken) when token is ready
        return new Promise((resolve) => {
            // Set up handler for FCM token
            window.handleFCMToken = async (fcmToken) => {
                try {
                    // Send token to backend
                    const response = await fetch('/api/fcm/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            fcmToken,
                            deviceInfo: {
                                userAgent: navigator.userAgent,
                                platform: 'android',
                                timestamp: new Date().toISOString()
                            }
                        })
                    })

                    const data = await response.json()

                    if (data.success) {
                        console.log('✅ FCM token registered successfully')
                        localStorage.setItem('fcm_token', fcmToken)
                        resolve({ success: true, data })
                    } else {
                        console.error('❌ Failed to register FCM token:', data.message)
                        resolve({ success: false, message: data.message })
                    }
                } catch (error) {
                    console.error('❌ Error registering FCM token:', error)
                    resolve({ success: false, message: error.message })
                }
            }

            // Timeout after 10 seconds
            setTimeout(() => {
                resolve({ success: false, message: 'Token registration timeout' })
            }, 10000)
        })
    } catch (error) {
        console.error('❌ Error requesting FCM token:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Unregister FCM token (on logout)
 * @param {string} token - JWT token for authentication
 */
export async function unregisterFCMToken(token) {
    if (!isFCMSupported()) {
        return { success: true }
    }

    try {
        const fcmToken = localStorage.getItem('fcm_token')

        if (fcmToken) {
            // Remove from backend
            const response = await fetch('/api/fcm/token', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fcmToken })
            })

            const data = await response.json()

            // Clear Android token
            if (window.AndroidFCM && window.AndroidFCM.logout) {
                window.AndroidFCM.logout()
            }

            localStorage.removeItem('fcm_token')
            console.log('✅ FCM token unregistered')

            return data
        }

        return { success: true }
    } catch (error) {
        console.error('❌ Error unregistering FCM token:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Update notification preferences
 * @param {object} preferences - Notification preferences object
 * @param {string} token - JWT token for authentication
 */
export async function updateNotificationPreferences(preferences, token) {
    try {
        const response = await fetch('/api/fcm/token', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ preferences })
        })

        const data = await response.json()

        if (data.success) {
            console.log('✅ Notification preferences updated')
        } else {
            console.error('❌ Failed to update preferences:', data.message)
        }

        return data
    } catch (error) {
        console.error('❌ Error updating preferences:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Get current FCM token
 */
export function getCurrentFCMToken() {
    return localStorage.getItem('fcm_token')
}

/**
 * Check if notifications are enabled for a specific type
 * @param {object} user - User object with notificationPreferences
 * @param {string} type - Notification type (chat, projects, leave, etc.)
 */
export function areNotificationsEnabled(user, type) {
    if (!user || !user.notificationPreferences) {
        return true // Default to enabled
    }

    return user.notificationPreferences[type] !== false
}
