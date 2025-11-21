package sbs.zenova.twa

import android.app.Application
import android.util.Log
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import com.onesignal.notifications.INotificationClickListener
import com.onesignal.notifications.INotificationLifecycleListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TalioApplication : Application() {

    companion object {
        const val TAG = "TalioApp"
        // OneSignal App ID - Same for both Web and Android
        const val ONESIGNAL_APP_ID = "d39b9d6c-e7b9-4bae-ad23-66b382b358f2"
    }

    override fun onCreate() {
        super.onCreate()

        Log.d(TAG, "🚀 Initializing Talio App...")

        // Verbose Logging set to help debug issues, remove before releasing your app.
        OneSignal.Debug.logLevel = LogLevel.VERBOSE

        // OneSignal Initialization - This must be done BEFORE any other OneSignal calls
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)

        Log.d(TAG, "✅ OneSignal initialized with App ID: $ONESIGNAL_APP_ID")

        // DO NOT request notification permission here - it will be requested after user logs in
        // Permission flow: User logs in → Dashboard → Web app triggers OneSignal banner → Native permission
        Log.d(TAG, "⏳ Notification permission will be requested after user login")

        // Set notification click handler with proper listener interface
        OneSignal.Notifications.addClickListener(object : INotificationClickListener {
            override fun onClick(event: com.onesignal.notifications.INotificationClickEvent) {
                Log.d(TAG, "📱 Notification clicked: ${event.notification.title}")

                // Handle notification click - you can add deep linking logic here
                val data = event.notification.additionalData
                if (data != null) {
                    Log.d(TAG, "Notification data: $data")
                }
            }
        })

        // Set notification foreground handler with proper listener interface
        OneSignal.Notifications.addForegroundLifecycleListener(object : INotificationLifecycleListener {
            override fun onWillDisplay(event: com.onesignal.notifications.INotificationWillDisplayEvent) {
                Log.d(TAG, "📬 Notification will display: ${event.notification.title}")
                // The notification will be shown automatically
            }
        })

        Log.d(TAG, "✅ OneSignal setup complete")
    }

}

