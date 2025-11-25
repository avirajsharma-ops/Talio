package sbs.zenova.twa.services

import android.Manifest
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import sbs.zenova.twa.MainActivity
import sbs.zenova.twa.R
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class LocationTrackingService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val CHANNEL_ID = "location_tracking_channel"
    private val NOTIFICATION_ID = 1001
    private val GEOFENCE_VIOLATION_CHANNEL_ID = "geofence_violation_channel"
    private val GEOFENCE_VIOLATION_NOTIFICATION_ID = 1002
    private val client = OkHttpClient()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isWithinGeofence = true
    private var lastNotificationTime = 0L

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
        }

        createNotificationChannel()
        createGeofenceViolationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        startLocationUpdates()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracking your location for attendance"
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createGeofenceViolationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                GEOFENCE_VIOLATION_CHANNEL_ID,
                "Geofence Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when you leave the office premises"
                enableVibration(true)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Talio HRMS")
            .setContentText("Tracking location for attendance")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            300000 // 5 minutes
        ).apply {
            setMinUpdateIntervalMillis(60000) // 1 minute
        }.build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun handleLocationUpdate(location: Location) {
        // Store location in shared preferences
        val sharedPref = getSharedPreferences("talio_prefs", MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("last_latitude", location.latitude.toString())
            putString("last_longitude", location.longitude.toString())
            putLong("last_location_time", System.currentTimeMillis())
            apply()
        }

        // Send location to server
        serviceScope.launch {
            sendLocationToServer(location)
        }
    }

    private suspend fun sendLocationToServer(location: Location) {
        try {
            val sharedPref = getSharedPreferences("talio_prefs", MODE_PRIVATE)
            val token = sharedPref.getString("auth_token", null) ?: return
            val baseUrl = sharedPref.getString("base_url", "https://tailo.vercel.app") ?: "https://tailo.vercel.app"

            val json = JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy)
                put("eventType", "location_update")
            }

            val body = json.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/geofence/log")
                .addHeader("Authorization", "Bearer $token")
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                val jsonResponse = JSONObject(responseBody)
                if (jsonResponse.getBoolean("success")) {
                    val data = jsonResponse.getJSONObject("data")
                    val withinGeofence = data.getBoolean("isWithinGeofence")
                    val requiresApproval = data.optBoolean("requiresApproval", false)
                    val distance = data.optInt("distance", 0)
                    val locationName = data.optString("locationName", "")

                    // Check if status changed
                    if (isWithinGeofence && !withinGeofence) {
                        // Just exited geofence
                        isWithinGeofence = false
                        showGeofenceViolationNotification(distance, locationName, requiresApproval)
                    } else if (!isWithinGeofence && withinGeofence) {
                        // Just entered geofence
                        isWithinGeofence = true
                        dismissGeofenceViolationNotification()
                    } else if (!withinGeofence) {
                        // Still outside - show notification periodically (every 15 minutes)
                        val currentTime = System.currentTimeMillis()
                        if (currentTime - lastNotificationTime > 15 * 60 * 1000) {
                            showGeofenceViolationNotification(distance, locationName, requiresApproval)
                            lastNotificationTime = currentTime
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showGeofenceViolationNotification(distance: Int, locationName: String, requiresApproval: Boolean) {
        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val locationText = if (locationName.isNotEmpty()) {
            "You are ${distance}m from $locationName"
        } else {
            "You are ${distance}m from the office"
        }

        val contentText = if (requiresApproval) {
            "$locationText. Please provide a reason for being outside."
        } else {
            "$locationText during work hours."
        }

        val notification = NotificationCompat.Builder(this, GEOFENCE_VIOLATION_CHANNEL_ID)
            .setContentTitle("⚠️ Outside Office Premises")
            .setContentText(contentText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(contentText))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(GEOFENCE_VIOLATION_NOTIFICATION_ID, notification)
    }

    private fun dismissGeofenceViolationNotification() {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.cancel(GEOFENCE_VIOLATION_NOTIFICATION_ID)
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }
}

