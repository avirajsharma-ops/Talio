package sbs.zenova.twa

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TalioApplication : Application() {

    companion object {
        const val TAG = "TalioApp"
    }

    override fun onCreate() {
        super.onCreate()

        Log.d(TAG, "🚀 Initializing Talio App...")

        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        Log.d(TAG, "✅ Firebase initialized")

        // Get FCM token in background
        CoroutineScope(Dispatchers.IO).launch {
            try {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        Log.d(TAG, "✅ FCM Token retrieved: $token")
                        // Token will be sent to server after user logs in
                    } else {
                        Log.e(TAG, "❌ Failed to get FCM token", task.exception)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error getting FCM token", e)
            }
        }

        Log.d(TAG, "⏳ FCM token will be sent to server after user login")
        Log.d(TAG, "✅ Firebase setup complete")
    }

}

