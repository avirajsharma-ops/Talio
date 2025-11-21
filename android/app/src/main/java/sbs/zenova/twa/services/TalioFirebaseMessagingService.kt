package sbs.zenova.twa.services

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import sbs.zenova.twa.MainActivity
import sbs.zenova.twa.R
import sbs.zenova.twa.TalioApplication

/**
 * Firebase Cloud Messaging Service
 * Handles incoming push notifications from Firebase
 *
 * CRITICAL: This service handles notifications even when app is completely killed
 * It processes both notification and data payloads for maximum reliability
 */
class TalioFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "TalioFCM"
        private const val NOTIFICATION_GROUP = "TALIO_NOTIFICATIONS"
    }

    /**
     * Called when a new FCM token is generated
     * This happens on app install, reinstall, or token refresh
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "🔑 New FCM token generated: ${token.take(20)}...")

        // Send token to server
        sendTokenToServer(token)
    }

    /**
     * Called when a message is received
     * CRITICAL: This is called even when app is killed (if data payload is present)
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        Log.d(TAG, "📩 Message received from: ${remoteMessage.from}")
        Log.d(TAG, "📦 Data payload: ${remoteMessage.data}")
        Log.d(TAG, "🔔 Notification payload: ${remoteMessage.notification}")

        // PRIORITY 1: Check data payload first (works when app is killed)
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "✅ Processing data payload (app may be killed)")

            val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title ?: "Talio HRMS"
            val message = remoteMessage.data["body"] ?: remoteMessage.data["message"] ?: remoteMessage.notification?.body ?: ""

            showNotification(
                title = title,
                message = message,
                data = remoteMessage.data
            )
            return
        }

        // PRIORITY 2: Fallback to notification payload (works when app is in foreground/background)
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "✅ Processing notification payload (app is running)")

            showNotification(
                title = notification.title ?: "Talio HRMS",
                message = notification.body ?: "",
                data = remoteMessage.data
            )
            return
        }

        Log.w(TAG, "⚠️ No valid payload found in message")
    }

    /**
     * Show notification to user with WhatsApp-like behavior
     * CRITICAL: This must work even when app is completely killed
     */
    private fun showNotification(
        title: String,
        message: String,
        data: Map<String, String>
    ) {
        val notificationType = data["type"] ?: "general"
        val url = data["url"] ?: data["click_action"] ?: "https://zenova.sbs/dashboard"

        Log.d(TAG, "🔔 Showing notification - Type: $notificationType, Title: $title")

        // Determine notification channel based on type (matches TalioApplication.kt)
        val channelId = when (notificationType) {
            "message", "chat" -> TalioApplication.CHANNEL_ID_MESSAGES
            "task", "task_assigned", "task_status_update", "task_completed" -> TalioApplication.CHANNEL_ID_TASKS
            "announcement" -> TalioApplication.CHANNEL_ID_ANNOUNCEMENTS
            else -> TalioApplication.CHANNEL_ID_GENERAL
        }

        // Create intent to open app at specific URL
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("url", url)
            putExtra("notification_type", notificationType)
            putExtra("from_notification", true)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        // Get notification icon and color based on type
        val (icon, color) = when (notificationType) {
            "message", "chat" -> Pair(android.R.drawable.ic_dialog_email, Color.parseColor("#192A5A"))
            "task", "task_assigned", "task_status_update", "task_completed" -> Pair(android.R.drawable.ic_menu_agenda, Color.parseColor("#4CAF50"))
            "announcement" -> Pair(android.R.drawable.ic_dialog_info, Color.parseColor("#FFA500"))
            else -> Pair(R.mipmap.ic_launcher, Color.parseColor("#192A5A"))
        }

        // WhatsApp-like vibration pattern
        val vibrationPattern = when (notificationType) {
            "message", "chat" -> longArrayOf(0, 250, 250, 250) // Short bursts for messages
            "announcement" -> longArrayOf(0, 500, 200, 500) // Longer for announcements
            else -> longArrayOf(0, 300, 200, 300) // Default pattern
        }

        // Build notification with WhatsApp-like features
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true) // Dismiss when tapped
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH) // High priority for heads-up
            .setCategory(NotificationCompat.CATEGORY_MESSAGE) // Treat as message for better visibility
            .setStyle(NotificationCompat.BigTextStyle().bigText(message)) // Show full message
            .setColor(color) // Notification color
            .setVibrate(vibrationPattern) // Custom vibration
            .setLights(color, 1000, 1000) // LED notification
            .setGroup(NOTIFICATION_GROUP) // Group notifications
            .setGroupSummary(false) // Individual notification
            .setShowWhen(true) // Show timestamp
            .setWhen(System.currentTimeMillis())
            .setDefaults(NotificationCompat.DEFAULT_ALL) // Use all defaults
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on lock screen

        // Add action buttons for messages (WhatsApp-like)
        if (notificationType == "message" || notificationType == "chat") {
            // Open action
            val openIntent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("url", url)
                putExtra("action", "open")
            }
            val openPendingIntent = PendingIntent.getActivity(
                this,
                System.currentTimeMillis().toInt() + 1,
                openIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            notificationBuilder.addAction(
                android.R.drawable.ic_menu_view,
                "Open",
                openPendingIntent
            )
        }

        // Show notification
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Use unique notification ID based on type and content
        val notificationId = when (notificationType) {
            "message", "chat" -> {
                // For messages, use chat ID to group messages from same chat
                val chatId = data["chatId"] ?: data["chat_id"]
                if (chatId != null) {
                    ("message_$chatId").hashCode()
                } else {
                    System.currentTimeMillis().toInt()
                }
            }
            else -> System.currentTimeMillis().toInt()
        }

        notificationManager.notify(notificationId, notificationBuilder.build())

        Log.d(TAG, "✅ Notification displayed successfully - ID: $notificationId, Channel: $channelId")
    }

    /**
     * Send FCM token to server
     */
    private fun sendTokenToServer(token: String) {
        // Store token locally
        val sharedPreferences = getSharedPreferences("talio_prefs", Context.MODE_PRIVATE)
        sharedPreferences.edit().putString("fcm_token", token).apply()
        
        Log.d(TAG, "FCM token stored locally: $token")
        
        // The WebView will handle sending the token to the server when user logs in
        // This is because we need the auth token to make the API call
    }
}

