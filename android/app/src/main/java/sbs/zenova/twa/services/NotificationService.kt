package sbs.zenova.twa.services

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import sbs.zenova.twa.BuildConfig
import sbs.zenova.twa.MainActivity
import sbs.zenova.twa.R
import sbs.zenova.twa.notifications.TalioNotificationManager
import java.net.URISyntaxException

class NotificationService : Service() {

    companion object {
        private const val TAG = "NotificationService"
        private const val CHANNEL_ID = "talio_service"
        private const val NOTIFICATION_ID = 9999
        // Use the same URL as the WebView from BuildConfig
        private val SERVER_URL = BuildConfig.BASE_URL
        
        fun start(context: Context, userId: String) {
            val intent = Intent(context, NotificationService::class.java).apply {
                putExtra("user_id", userId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            context.stopService(Intent(context, NotificationService::class.java))
        }
    }

    private var socket: Socket? = null
    private var userId: String? = null
    private lateinit var notificationManager: TalioNotificationManager

    override fun onCreate() {
        super.onCreate()
        notificationManager = TalioNotificationManager(this)
        createServiceNotificationChannel()
        startForeground(NOTIFICATION_ID, createServiceNotification())
        Log.d(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        userId = intent?.getStringExtra("user_id")
        
        if (userId != null) {
            connectToSocket()
        } else {
            Log.e(TAG, "No user ID provided, stopping service")
            stopSelf()
        }
        
        return START_STICKY
    }

    private fun connectToSocket() {
        try {
            val opts = IO.Options().apply {
                path = "/api/socketio"
                transports = arrayOf("polling", "websocket")
                reconnection = true
                reconnectionDelay = 1000
                reconnectionAttempts = Int.MAX_VALUE
                timeout = 20000
            }

            socket = IO.socket(SERVER_URL, opts)

            // Connection events
            socket?.on(Socket.EVENT_CONNECT, onConnect)
            socket?.on(Socket.EVENT_DISCONNECT, onDisconnect)
            socket?.on(Socket.EVENT_CONNECT_ERROR, onConnectError)

            // Application events
            socket?.on("new-message", onNewMessage)
            socket?.on("new-announcement", onNewAnnouncement)
            socket?.on("task-assigned", onTaskAssigned)
            socket?.on("task-updated", onTaskUpdated)
            socket?.on("task-approved", onTaskApproved)
            socket?.on("task-rejected", onTaskRejected)
            socket?.on("custom-notification", onCustomNotification)
            socket?.on("geofence-approval", onGeofenceApproval)

            socket?.connect()
            Log.d(TAG, "Connecting to Socket.IO server...")

        } catch (e: URISyntaxException) {
            Log.e(TAG, "Socket connection error", e)
        }
    }

    private val onConnect = Emitter.Listener {
        Log.d(TAG, "Socket connected")
        userId?.let { uid ->
            socket?.emit("authenticate", uid)
            Log.d(TAG, "Authenticated with user ID: $uid")
        }
        updateServiceNotification("Connected")
    }

    private val onDisconnect = Emitter.Listener {
        Log.d(TAG, "Socket disconnected")
        updateServiceNotification("Disconnected - Reconnecting...")
    }

    private val onConnectError = Emitter.Listener { args ->
        Log.e(TAG, "Socket connection error: ${args.joinToString()}")
        updateServiceNotification("Connection error - Retrying...")
    }

    private val onNewMessage = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val message = data.getJSONObject("message")
            val senderName = message.getJSONObject("sender").getString("firstName") + " " +
                           message.getJSONObject("sender").getString("lastName")
            val messageText = message.getString("text")
            val chatId = data.getString("chatId")

            Log.d(TAG, "New message from $senderName: $messageText")

            notificationManager.showMessageNotification(
                title = senderName,
                message = messageText,
                chatId = chatId,
                senderId = message.getJSONObject("sender").getString("_id"),
                senderName = senderName
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling new message", e)
        }
    }

    private val onNewAnnouncement = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val title = data.getString("title")
            val content = data.getString("content")
            val priority = data.optString("priority", "normal")
            val announcementId = data.getString("_id")

            Log.d(TAG, "New announcement: $title")

            notificationManager.showAnnouncementNotification(
                title = title,
                content = content,
                priority = priority,
                announcementId = announcementId
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling new announcement", e)
        }
    }

    private val onTaskAssigned = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val taskTitle = data.getString("title")
            val priority = data.optString("priority", "normal")
            val dueDate = data.optString("dueDate", null)
            val taskId = data.getString("_id")
            val assignerName = data.optString("assignerName", "Manager")

            Log.d(TAG, "Task assigned: $taskTitle")

            notificationManager.showTaskNotification(
                title = "New Task from $assignerName",
                taskTitle = taskTitle,
                priority = priority,
                dueDate = dueDate,
                taskId = taskId,
                action = "assigned"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling task assignment", e)
        }
    }

    private val onTaskUpdated = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val taskTitle = data.getString("title")
            val priority = data.optString("priority", "normal")
            val taskId = data.getString("_id")

            Log.d(TAG, "Task updated: $taskTitle")

            notificationManager.showTaskNotification(
                title = "Task Updated",
                taskTitle = taskTitle,
                priority = priority,
                taskId = taskId,
                action = "updated"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling task update", e)
        }
    }

    private val onTaskApproved = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val taskTitle = data.getString("title")
            val taskId = data.getString("_id")
            val approverName = data.optString("approverName", "Manager")

            Log.d(TAG, "Task approved: $taskTitle")

            notificationManager.showTaskNotification(
                title = "Task Approved by $approverName",
                taskTitle = taskTitle,
                priority = "normal",
                taskId = taskId,
                action = "approved"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling task approval", e)
        }
    }

    private val onTaskRejected = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val taskTitle = data.getString("title")
            val taskId = data.getString("_id")
            val approverName = data.optString("approverName", "Manager")
            val reason = data.optString("reason", "")

            Log.d(TAG, "Task rejected: $taskTitle")

            notificationManager.showTaskNotification(
                title = "Task Rejected by $approverName",
                taskTitle = if (reason.isNotEmpty()) "$taskTitle\nReason: $reason" else taskTitle,
                priority = "high",
                taskId = taskId,
                action = "rejected"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling task rejection", e)
        }
    }

    private val onCustomNotification = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val title = data.getString("title")
            val message = data.getString("message")
            val url = data.optString("url", "/dashboard")

            Log.d(TAG, "Custom notification: $title")

            notificationManager.showGeneralNotification(
                title = title,
                message = message,
                url = url
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling custom notification", e)
        }
    }

    private val onGeofenceApproval = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val action = data.getString("action")
            val notification = data.getJSONObject("notification")
            val title = notification.getString("title")
            val body = notification.getString("body")
            val url = notification.optString("url", "/dashboard/geofence")

            Log.d(TAG, "Geofence approval: $action")

            val icon = if (action == "approved") "✅" else "❌"
            notificationManager.showGeneralNotification(
                title = "$icon $title",
                message = body,
                url = url
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error handling geofence approval", e)
        }
    }

    private fun createServiceNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Talio Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Talio connected for real-time notifications"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createServiceNotification(status: String = "Starting..."): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Talio")
            .setContentText(status)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateServiceNotification(status: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, createServiceNotification(status))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        socket?.off()
        socket?.disconnect()
        socket = null
        Log.d(TAG, "Service destroyed")
    }
}

