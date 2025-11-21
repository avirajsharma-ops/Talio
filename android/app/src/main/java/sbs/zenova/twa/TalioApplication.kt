package sbs.zenova.twa

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import com.google.firebase.FirebaseApp
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class TalioApplication : Application() {

    companion object {
        const val TAG = "TalioApp"
        const val CHANNEL_ID_MESSAGES = "talio_messages"
        const val CHANNEL_ID_TASKS = "talio_tasks"
        const val CHANNEL_ID_ANNOUNCEMENTS = "talio_announcements"
        const val CHANNEL_ID_GENERAL = "talio_general"

        // OneSignal App ID
        const val ONESIGNAL_APP_ID = "f7b9d1a1-5095-4be8-8a74-2af13058e7b2"
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize Firebase (required by OneSignal for FCM)
        FirebaseApp.initializeApp(this)
        Log.d(TAG, "✅ Firebase initialized")

        // Create notification channels BEFORE initializing OneSignal
        createNotificationChannels()

        // Initialize OneSignal
        initializeOneSignal()
    }

    private fun initializeOneSignal() {
        // Verbose Logging set to help debug issues, remove before releasing your app.
        OneSignal.Debug.logLevel = LogLevel.VERBOSE

        // OneSignal Initialization
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)

        Log.d(TAG, "✅ OneSignal initialized with App ID: $ONESIGNAL_APP_ID")

        // Request notification permission (Android 13+)
        OneSignal.Notifications.requestPermission(true) { accepted ->
            if (accepted) {
                Log.d(TAG, "✅ Notification permission granted")
            } else {
                Log.w(TAG, "⚠️ Notification permission denied")
            }
        }

        // Set notification opened handler
        OneSignal.Notifications.addClickListener { event ->
            Log.d(TAG, "📱 Notification clicked: ${event.notification.title}")

            // Handle notification click
            val data = event.notification.additionalData
            if (data != null) {
                Log.d(TAG, "Notification data: $data")
                // You can handle deep linking here if needed
            }
        }

        // Set notification will show in foreground handler
        OneSignal.Notifications.addForegroundLifecycleListener { event ->
            Log.d(TAG, "📬 Notification received in foreground: ${event.notification.title}")
            // The notification will be shown automatically
        }

        Log.d(TAG, "✅ OneSignal handlers configured")
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // Messages Channel - HIGH IMPORTANCE for WhatsApp-like behavior
            val messagesChannel = NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH // Shows as heads-up notification
            ).apply {
                description = "Chat messages and direct communications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250) // WhatsApp-like pattern
                enableLights(true)
                lightColor = android.graphics.Color.BLUE
                setShowBadge(true) // Show badge on app icon
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC // Show on lock screen
                setSound(
                    android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }

            // Tasks Channel - HIGH IMPORTANCE
            val tasksChannel = NotificationChannel(
                CHANNEL_ID_TASKS,
                "Tasks",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Task assignments, updates, and completions"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 200, 300)
                enableLights(true)
                lightColor = android.graphics.Color.GREEN
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            // Announcements Channel - HIGH IMPORTANCE (changed from DEFAULT)
            val announcementsChannel = NotificationChannel(
                CHANNEL_ID_ANNOUNCEMENTS,
                "Announcements",
                NotificationManager.IMPORTANCE_HIGH // Important company announcements
            ).apply {
                description = "Company and department announcements"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
                enableLights(true)
                lightColor = android.graphics.Color.YELLOW
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            // General Channel - DEFAULT IMPORTANCE
            val generalChannel = NotificationChannel(
                CHANNEL_ID_GENERAL,
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General notifications and updates"
                enableVibration(true)
                enableLights(true)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            // Create all channels
            notificationManager.createNotificationChannel(messagesChannel)
            notificationManager.createNotificationChannel(tasksChannel)
            notificationManager.createNotificationChannel(announcementsChannel)
            notificationManager.createNotificationChannel(generalChannel)

            Log.d(TAG, "✅ Notification channels created with HIGH importance for instant delivery")
        }
    }
}

