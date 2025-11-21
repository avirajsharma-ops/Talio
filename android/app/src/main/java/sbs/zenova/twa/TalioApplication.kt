package sbs.zenova.twa

import android.app.Application
import android.util.Log
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

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

        // Request notification permission (Android 13+)
        // This will automatically prompt the user for permission
        OneSignal.Notifications.requestPermission(true) { accepted ->
            if (accepted) {
                Log.d(TAG, "✅ Notification permission granted")
            } else {
                Log.w(TAG, "⚠️ Notification permission denied")
            }
        }

        // Set notification click handler
        OneSignal.Notifications.addClickListener { event ->
            Log.d(TAG, "📱 Notification clicked: ${event.notification.title}")

            // Handle notification click - you can add deep linking logic here
            val data = event.notification.additionalData
            if (data != null) {
                Log.d(TAG, "Notification data: $data")
            }
        }

        // Set notification foreground handler
        OneSignal.Notifications.addForegroundLifecycleListener { event ->
            Log.d(TAG, "📬 Notification received in foreground: ${event.notification.title}")
            // The notification will be shown automatically
        }

        Log.d(TAG, "✅ OneSignal setup complete")
    }

}

