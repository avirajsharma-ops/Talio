/**
 * FCM Token Handler for Android App
 * This script provides a global function for the Android app to register FCM tokens
 */

(function () {
    'use strict';

    console.log('📱 FCM Handler loaded');

    /**
     * Handle FCM token registration from Android app
     * Called by MainActivity.kt when FCM token is obtained
     */
    window.handleFCMToken = async function (fcmToken, userId, deviceInfo) {
        try {
            console.log('📱 FCM Token received from Android:', {
                tokenPreview: fcmToken.substring(0, 20) + '...',
                userId,
                deviceInfo
            });

            // Get auth token from localStorage
            const authToken = localStorage.getItem('token');

            if (!authToken) {
                console.error('❌ No auth token found in localStorage. User may not be logged in.');
                // Store token temporarily for later registration
                localStorage.setItem('pending_fcm_token', fcmToken);
                localStorage.setItem('pending_fcm_device_info', JSON.stringify(deviceInfo));
                console.log('💾 FCM token stored temporarily. Will register after login.');
                return;
            }

            // Register token with backend
            const response = await fetch('/api/fcm/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    fcmToken,
                    deviceInfo: typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ FCM token registered successfully:', result);
                // Clear any pending tokens
                localStorage.removeItem('pending_fcm_token');
                localStorage.removeItem('pending_fcm_device_info');

                // Store token locally for reference
                localStorage.setItem('fcm_token', fcmToken);
                localStorage.setItem('fcm_registered', 'true');
                localStorage.setItem('fcm_registered_at', new Date().toISOString());
            } else {
                console.error('❌ Failed to register FCM token:', result.message);
            }

        } catch (error) {
            console.error('❌ Error handling FCM token:', error);
        }
    };

    /**
     * Check for pending FCM token after login
     */
    window.checkPendingFCMToken = async function () {
        try {
            const pendingToken = localStorage.getItem('pending_fcm_token');
            const pendingDeviceInfo = localStorage.getItem('pending_fcm_device_info');
            const userId = localStorage.getItem('userId');

            if (pendingToken && userId) {
                console.log('🔄 Found pending FCM token. Registering now...');
                const deviceInfo = pendingDeviceInfo ? JSON.parse(pendingDeviceInfo) : {};
                await window.handleFCMToken(pendingToken, userId, deviceInfo);
            }
        } catch (error) {
            console.error('❌ Error checking pending FCM token:', error);
        }
    };

    /**
     * Auto-check for pending tokens when page loads
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(() => {
                window.checkPendingFCMToken();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            window.checkPendingFCMToken();
        }, 1000);
    }

    /**
     * Listen for storage events (login from another tab)
     */
    window.addEventListener('storage', function (e) {
        if (e.key === 'token' && e.newValue) {
            console.log('🔐 Auth token detected. Checking for pending FCM token...');
            setTimeout(() => {
                window.checkPendingFCMToken();
            }, 500);
        }
    });

    console.log('✅ FCM Handler ready. Global functions available:');
    console.log('  - window.handleFCMToken(fcmToken, userId, deviceInfo)');
    console.log('  - window.checkPendingFCMToken()');

})();
