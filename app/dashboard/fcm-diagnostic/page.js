'use client'

import { useEffect, useState } from 'react'

export default function FCMDiagnosticPage() {
    const [diagnostics, setDiagnostics] = useState({
        hasAndroidFCM: false,
        token: null,
        permissions: null,
        userId: null,
        registrationStatus: null
    })

    useEffect(() => {
        checkFCMStatus()
    }, [])

    const checkFCMStatus = async () => {
        try {
            // Check if Android FCM interface exists
            const hasAndroidFCM = typeof window !== 'undefined' && window.AndroidFCM

            let token = null
            let permissions = null

            if (hasAndroidFCM) {
                // Get FCM token from Android
                token = window.AndroidFCM.getToken()
                console.log('Android FCM Token:', token)
            }

            // Get user info from localStorage
            const userStr = localStorage.getItem('user')
            const user = userStr ? JSON.parse(userStr) : null

            setDiagnostics({
                hasAndroidFCM,
                token,
                permissions: 'Check Android Settings',
                userId: user?._id || user?.id,
                userEmail: user?.email
            })

            // Try to register token if we have both
            if (token && user) {
                await registerToken(token)
            }

        } catch (error) {
            console.error('Diagnostic error:', error)
        }
    }

    const registerToken = async (token) => {
        try {
            const authToken = localStorage.getItem('token')

            const response = await fetch('/api/fcm/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token,
                    platform: 'android',
                    deviceInfo: {
                        model: 'Android Device',
                        osVersion: 'Unknown'
                    }
                })
            })

            const data = await response.json()

            setDiagnostics(prev => ({
                ...prev,
                registrationStatus: data.success ? 'Registered ✅' : `Failed: ${data.message}`
            }))

        } catch (error) {
            setDiagnostics(prev => ({
                ...prev,
                registrationStatus: `Error: ${error.message}`
            }))
        }
    }

    const sendTestNotification = async () => {
        try {
            const authToken = localStorage.getItem('token')

            const response = await fetch('/api/test-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    userId: diagnostics.userId,
                    type: 'message',
                    customTitle: '🧪 Test Notification',
                    customMessage: 'If you see this as a pop-up bubble, notifications are working!'
                })
            })

            const data = await response.json()
            alert(JSON.stringify(data, null, 2))

        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const forceRegisterToken = async () => {
        if (!window.AndroidFCM) {
            alert('Android FCM not available')
            return
        }

        try {
            const token = window.AndroidFCM.getToken()
            await registerToken(token)
            alert('Token registration attempted. Check status above.')
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🔍 FCM Diagnostic Tool</h1>

            <div style={{ background: '#f5f5f5', padding: '15px', marginTop: '20px', borderRadius: '8px' }}>
                <h2>Status</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Android FCM Interface:</strong></td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{diagnostics.hasAndroidFCM ? '✅ Available' : '❌ Not Available'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>FCM Token:</strong></td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd', wordBreak: 'break-all' }}>
                                {diagnostics.token ? `${diagnostics.token.substring(0, 30)}...` : '❌ No Token'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>User ID:</strong></td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{diagnostics.userId || '❌ Not logged in'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>User Email:</strong></td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{diagnostics.userEmail || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Registration Status:</strong></td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{diagnostics.registrationStatus || 'Not registered'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '30px' }}>
                <h2>Actions</h2>
                <button
                    onClick={forceRegisterToken}
                    style={{
                        padding: '12px 24px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px',
                        marginBottom: '10px'
                    }}
                >
                    📝 Register FCM Token
                </button>

                <button
                    onClick={sendTestNotification}
                    style={{
                        padding: '12px 24px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px',
                        marginBottom: '10px'
                    }}
                >
                    🧪 Send Test Notification
                </button>

                <button
                    onClick={checkFCMStatus}
                    style={{
                        padding: '12px 24px',
                        background: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '10px'
                    }}
                >
                    🔄 Refresh Status
                </button>
            </div>

            <div style={{ marginTop: '30px', background: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
                <h3>⚠️ Troubleshooting Steps:</h3>
                <ol>
                    <li><strong>Check Notification Permission:</strong> Go to Android Settings → Apps → Talio → Notifications → Make sure "All Talio notifications" is ON</li>
                    <li><strong>Check Battery Optimization:</strong> Settings → Apps → Talio → Battery → Unrestricted</li>
                    <li><strong>Register Token:</strong> Click "Register FCM Token" button above</li>
                    <li><strong>Test Notification:</strong> Click "Send Test Notification" - you should see a pop-up bubble</li>
                    <li><strong>Check Android Logs:</strong> Connect phone to PC → Run: <code>adb logcat | Select-String "FCM"</code></li>
                </ol>
            </div>

            <div style={{ marginTop: '20px', background: '#f8d7da', padding: '15px', borderRadius: '8px' }}>
                <h3>🗑️ Clear FCM Tokens from Database</h3>
                <p>If you want to start fresh, you can clear all FCM tokens and re-register.</p>
                <button
                    onClick={async () => {
                        if (!confirm('Are you sure you want to clear all FCM tokens? You will need to re-register.')) return

                        try {
                            const authToken = localStorage.getItem('token')
                            const response = await fetch('/api/fcm/token', {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${authToken}`
                                }
                            })
                            const data = await response.json()
                            alert(data.message)
                            checkFCMStatus()
                        } catch (error) {
                            alert('Error: ' + error.message)
                        }
                    }}
                    style={{
                        padding: '12px 24px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🗑️ Clear All FCM Tokens
                </button>
            </div>
        </div>
    )
}
