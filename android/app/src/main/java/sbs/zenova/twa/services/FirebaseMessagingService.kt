package sbs.zenova.twa.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import sbs.zenova.twa.MainActivity
import sbs.zenova.twa.R

class FirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCM_Service"
        private const val CHANNEL_ID = "talio_notifications"
        private const val CHANNEL_NAME = "Talio Notifications"
    }

    /**
     * Called when a new FCM token is generated
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Token: $token")
        
        // Send token to backend server
        sendTokenToServer(token)
        
        // Store token locally
        val prefs = getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()
    }

    /**
     * Called when a message is received
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        Log.d(TAG, "========== FCM MESSAGE RECEIVED ==========")
        Log.d(TAG, "Message received from: ${message.from}")
        Log.d(TAG, "Message ID: ${message.messageId}")
        Log.d(TAG, "Data payload: ${message.data}")
        Log.d(TAG, "Notification: ${message.notification}")
        Log.d(TAG, "==========================================")
        
        // Check if message contains a data payload
        message.data.isNotEmpty().let {
            Log.d(TAG, "Processing data payload...")
            handleDataMessage(message.data)
        }

        // Check if message contains a notification payload
        message.notification?.let {
            Log.d(TAG, "Processing notification payload...")
            Log.d(TAG, "Notification Title: ${it.title}")
            Log.d(TAG, "Message Notification Body: ${it.body}")
            sendNotification(
                title = it.title ?: "Talio HRMS",
                body = it.body ?: "",
                data = message.data
            )
        }
        
        // If no notification payload but has data, show notification from data
        if (message.notification == null && message.data.isNotEmpty()) {
            Log.d(TAG, "No notification payload, creating from data...")
            handleDataMessage(message.data)
        }
    }

    /**
     * Handle data messages for custom processing
     */
    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"]
        val title = data["title"] ?: "Talio HRMS"
        val body = data["body"] ?: ""
        
        when (type) {
            "chat" -> sendNotification(title, body, data, "chat")
            "project" -> sendNotification(title, body, data, "project")
            "leave" -> sendNotification(title, body, data, "leave")
            "attendance" -> sendNotification(title, body, data, "attendance")
            "announcement" -> sendNotification(title, body, data, "announcement")
            else -> sendNotification(title, body, data)
        }
    }

    /**
     * Create and show a notification
     */
    private fun sendNotification(
        title: String,
        body: String,
        data: Map<String, String> = emptyMap(),
        type: String = "default"
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            
            // Add data to intent for deep linking
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
            putExtra("notification_type", type)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .setLights(android.graphics.Color.BLUE, 1000, 1000)
            // Critical for heads-up notifications (pop-up bubbles)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, false)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications from Talio HRMS"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
                enableLights(true)
                lightColor = android.graphics.Color.BLUE
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                // This is KEY for pop-up notifications
                setShowBadge(true)
                setBypassDnd(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    /**
     * Send FCM token to backend server
     */
    private fun sendTokenToServer(token: String) {
        // This will be called from MainActivity with proper user context
        Log.d(TAG, "Token ready to send to server: $token")
    }

    /**
     * Called when messages are deleted on the server
     */
    override fun onDeletedMessages() {
        super.onDeletedMessages()
        Log.d(TAG, "Messages deleted on server")
    }

    /**
     * Called when a message fails to be sent
     */
    override fun onMessageSent(msgId: String) {
        super.onMessageSent(msgId)
        Log.d(TAG, "Message sent: $msgId")
    }

    /**
     * Called when there's an error sending a message
     */
    override fun onSendError(msgId: String, exception: Exception) {
        super.onSendError(msgId, exception)
        Log.e(TAG, "Send error for message $msgId: ${exception.message}")
    }
}
