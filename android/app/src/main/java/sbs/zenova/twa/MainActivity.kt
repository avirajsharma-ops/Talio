package sbs.zenova.twa

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import com.google.android.gms.location.*
import com.google.firebase.messaging.FirebaseMessaging
import sbs.zenova.twa.databinding.ActivityMainBinding
import sbs.zenova.twa.services.NotificationService
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    companion object {
        private val URL = BuildConfig.BASE_URL
        private const val LOCATION_PERMISSION_REQUEST_CODE = 100
    }

    private var permissionsRequested = false

    // File chooser launcher
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val results = if (data == null) null else arrayOf(Uri.parse(data.dataString))
            fileUploadCallback?.onReceiveValue(results)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    // Notification permission launcher (Android 13+)
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        handleNotificationPermissionResult(isGranted)
    }

    // Location permission launcher
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        handleLocationPermissionResult(permissions)
    }

    // Background location permission launcher (Android 10+)
    private val backgroundLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        handleBackgroundLocationPermissionResult(isGranted)
    }

    // Handler functions to avoid recursive type inference
    private fun handleNotificationPermissionResult(isGranted: Boolean) {
        if (isGranted) {
            Toast.makeText(this, "Notification permission granted", Toast.LENGTH_SHORT).show()
            requestLocationPermissionSequence()
        } else {
            showPermissionRequiredDialog(
                title = "Notification Permission Required",
                message = "Notifications are required to receive important updates about attendance, tasks, and announcements. Please grant this permission.",
                onRetry = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                },
                onSkip = {
                    requestLocationPermissionSequence()
                }
            )
        }
    }

    private fun handleLocationPermissionResult(permissions: Map<String, Boolean>) {
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineLocationGranted || coarseLocationGranted) {
            startLocationUpdates()
            geolocationCallback?.invoke(geolocationOrigin, true, false)
            Toast.makeText(this, "Location permission granted", Toast.LENGTH_SHORT).show()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestBackgroundLocationPermission()
            } else {
                requestBatteryOptimizationExemption()
            }
        } else {
            geolocationCallback?.invoke(geolocationOrigin, false, false)
            showPermissionRequiredDialog(
                title = "Location Permission Required",
                message = "Location access is required for attendance tracking and geofencing. This is essential for the app to function properly.",
                onRetry = {
                    requestLocationPermission()
                },
                onSkip = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        requestBackgroundLocationPermission()
                    } else {
                        requestBatteryOptimizationExemption()
                    }
                }
            )
        }
    }

    private fun handleBackgroundLocationPermissionResult(isGranted: Boolean) {
        if (isGranted) {
            Toast.makeText(this, "Background location permission granted", Toast.LENGTH_SHORT).show()
            requestBatteryOptimizationExemption()
        } else {
            showPermissionRequiredDialog(
                title = "Background Location Required",
                message = "Background location access is required for geofencing and automatic attendance tracking even when the app is closed. This is essential for the app to function properly.",
                onRetry = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        backgroundLocationPermissionLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    }
                },
                onSkip = {
                    requestBatteryOptimizationExemption()
                }
            )
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep splash screen theme until WebView is ready
        setTheme(R.style.Theme_Talio_Splash)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Setup window for edge-to-edge display
        setupWindow()

        // Initialize location client
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        // Setup location callback
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    sendLocationToWebView(location)
                }
            }
        }

        // Setup WebView
        setupWebView()

        // Request permissions on first launch
        requestPermissions()

        // Load URL
        binding.webView.loadUrl(URL)
    }

    private fun setupWindow() {
        // DON'T use edge-to-edge - let system bars have their own space
        WindowCompat.setDecorFitsSystemWindows(window, true)

        // FORCE WHITE STATUS BAR with dark icons
        window.statusBarColor = Color.WHITE

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+)
            window.insetsController?.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6.0+ (API 23+)
            @Suppress("DEPRECATION")
            var flags = window.decorView.systemUiVisibility
            flags = flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            window.decorView.systemUiVisibility = flags
        }

        // Set WHITE navigation bar (will be updated dynamically based on bottom nav)
        window.navigationBarColor = Color.WHITE

        // Disable navigation bar contrast enforcement (Android 10+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }

        // Set dark navigation bar icons for white background (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                )
            } else {
                @Suppress("DEPRECATION")
                var flags = window.decorView.systemUiVisibility
                flags = flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                window.decorView.systemUiVisibility = flags
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // Enable cookies for session management
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(binding.webView, true)
        }

        binding.webView.apply {
            // Set WebView background to white to prevent black flash
            setBackgroundColor(Color.WHITE)

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                allowFileAccess = true
                allowContentAccess = true
                setSupportZoom(true)
                builtInZoomControls = false
                displayZoomControls = false
                loadWithOverviewMode = true
                useWideViewPort = true
                javaScriptCanOpenWindowsAutomatically = true
                mediaPlaybackRequiresUserGesture = false

                // Enable geolocation
                setGeolocationEnabled(true)

                // User agent - mark as standalone app
                userAgentString = "$userAgentString TalioApp/1.0 (standalone)"
            }

            // Add JavaScript interface for location
            addJavascriptInterface(LocationInterface(), "AndroidLocation")

            // Add JavaScript interface for navigation bar color and notifications
            addJavascriptInterface(NavigationBarInterface(), "AndroidInterface")
            addJavascriptInterface(NotificationInterface(), "AndroidNotifications")

            // Add JavaScript interface for Firebase Cloud Messaging
            addJavascriptInterface(FCMInterface(), "AndroidFCM")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url.toString()

                    // Handle different URL types
                    return when {
                        // App's own URLs - keep in WebView
                        url.startsWith(URL) -> false

                        // Google OAuth URLs - open in Chrome Custom Tabs to avoid 403 error
                        url.contains("accounts.google.com") ||
                        url.contains("google.com/o/oauth2") ||
                        url.contains("google.com/signin") -> {
                            openInCustomTab(url)
                            true
                        }

                        // All other external links - open in external browser
                        else -> {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            true
                        }
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)

                    // Only handle main frame errors
                    if (request?.isForMainFrame == true) {
                        android.util.Log.e("WebView", "Error loading page: ${error?.description}")
                        // Load offline error page
                        view?.loadUrl("file:///android_asset/error-fallback.html")
                    }
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)

                    // Only handle main frame errors with 5xx status codes
                    if (request?.isForMainFrame == true &&
                        errorResponse?.statusCode != null &&
                        errorResponse.statusCode >= 500) {
                        android.util.Log.e("WebView", "HTTP Error: ${errorResponse.statusCode}")
                        // Load offline error page
                        view?.loadUrl("file:///android_asset/error-fallback.html")
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)

                    // Switch from splash theme to normal theme after first page load
                    setTheme(R.style.Theme_Talio)

                    // Inject standalone mode detection and navigation bar color adapter
                    view?.evaluateJavascript("""
                        (function() {
                            // Mark as standalone app
                            window.isStandaloneApp = true;
                            window.matchMedia('(display-mode: standalone)').matches = true;

                            // Ensure localStorage is working
                            try {
                                localStorage.setItem('_test', '1');
                                localStorage.removeItem('_test');
                            } catch(e) {
                                console.error('localStorage not working:', e);
                            }

                            // Function to detect bottom navigation bar color
                            function detectBottomNavColor() {
                                // Try to find the bottom navigation bar
                                const bottomNav = document.querySelector('nav[class*="bottom"]') ||
                                                 document.querySelector('[class*="BottomNav"]') ||
                                                 document.querySelector('[class*="bottom-nav"]') ||
                                                 document.querySelector('nav:last-of-type');

                                if (bottomNav) {
                                    const bgColor = window.getComputedStyle(bottomNav).backgroundColor;
                                    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                                        return bgColor;
                                    }
                                }

                                // Default to white if not found
                                return 'rgb(255, 255, 255)';
                            }

                            // Send color to Android
                            window.AndroidNavBar = window.AndroidNavBar || {};
                            window.AndroidNavBar.updateColor = function() {
                                const color = detectBottomNavColor();
                                if (window.AndroidInterface) {
                                    window.AndroidInterface.setNavigationBarColor(color);
                                }
                            };

                            // Update color on load and when DOM changes
                            setTimeout(window.AndroidNavBar.updateColor, 500);
                            setTimeout(window.AndroidNavBar.updateColor, 1000);
                            setTimeout(window.AndroidNavBar.updateColor, 2000);

                            // Watch for DOM changes
                            if (window.MutationObserver) {
                                const observer = new MutationObserver(function() {
                                    window.AndroidNavBar.updateColor();
                                });
                                observer.observe(document.body, {
                                    childList: true,
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ['class', 'style']
                                });
                            }

                            // Start notification service and FCM token registration when user is logged in
                            function startNotificationService() {
                                try {
                                    let userId = localStorage.getItem('userId');
                                    if (!userId) {
                                        try {
                                            const storedUser = localStorage.getItem('user');
                                            if (storedUser) {
                                                const parsedUser = JSON.parse(storedUser);
                                                userId = parsedUser?.id || parsedUser?._id || parsedUser?.userId || null;
                                            }
                                        } catch (parseError) {
                                            console.error('Failed to derive userId from stored user:', parseError);
                                        }
                                    }
                                    if (userId) {
                                        // Start notification service
                                        if (window.AndroidNotifications) {
                                            window.AndroidNotifications.startService(userId);
                                            console.log('Notification service started for user:', userId);
                                        }

                                        // Register FCM token with backend
                                        if (window.AndroidFCM) {
                                            window.AndroidFCM.registerToken(userId);
                                            console.log('FCM token registration for user:', userId);
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to start notification service:', e);
                                }
                            }

                            // Check if user is logged in and start service
                            setTimeout(startNotificationService, 1000);

                            // Listen for login events
                            window.addEventListener('storage', function(e) {
                                if (e.key === 'userId' && e.newValue) {
                                    startNotificationService();
                                }
                            });
                        })();
                    """.trimIndent(), null)

                    // Check if user is on dashboard and request permissions
                    checkDashboardAndRequestPermissions(url)
                }
            }

            webChromeClient = object : WebChromeClient() {
                // Handle file upload
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = filePathCallback

                    val intent = fileChooserParams?.createIntent()
                    try {
                        fileChooserLauncher.launch(intent)
                    } catch (e: Exception) {
                        fileUploadCallback = null
                        Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_SHORT).show()
                        return false
                    }
                    return true
                }

                // Handle geolocation permission
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    geolocationOrigin = origin
                    geolocationCallback = callback
                    
                    if (hasLocationPermission()) {
                        callback?.invoke(origin, true, false)
                        startLocationUpdates()
                    } else {
                        requestLocationPermission()
                    }
                }

                // Handle console messages for debugging
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        android.util.Log.d("WebView", "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                    }
                    return true
                }
            }
        }
    }

    private fun requestPermissions() {
        // Request notification permission first (Android 13+), then location permissions
        Log.d("Permissions", "Starting permission request sequence")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires POST_NOTIFICATIONS permission
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                // Notification permission already granted, proceed to location
                requestLocationPermissionSequence()
            }
        } else {
            // Android 12 and below - notifications don't need runtime permission
            requestLocationPermissionSequence()
        }
    }

    private fun requestLocationPermissionSequence() {
        if (!hasLocationPermission()) {
            requestLocationPermission()
        } else {
            startLocationUpdates()
            // If location already granted, check background location
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestBackgroundLocationPermission()
            }
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestLocationPermission() {
        // Request foreground location permissions only
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        locationPermissionLauncher.launch(permissions)
    }

    private fun requestBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != PackageManager.PERMISSION_GRANTED
            ) {
                backgroundLocationPermissionLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            } else {
                // Already granted, request battery optimization
                requestBatteryOptimizationExemption()
            }
        }
    }

    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(POWER_SERVICE) as PowerManager
            val packageName = packageName

            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                // Show dialog explaining why this is needed
                showPermissionRequiredDialog(
                    title = "Background Running Required",
                    message = "To ensure the app works properly for attendance tracking and geofencing even when closed, please allow the app to run in the background without battery restrictions.",
                    onRetry = {
                        try {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                            }
                            startActivity(intent)
                        } catch (e: Exception) {
                            Log.e("BatteryOptimization", "Failed to request battery optimization exemption", e)
                            Toast.makeText(this, "Please disable battery optimization manually in Settings", Toast.LENGTH_LONG).show()
                        }
                    },
                    onSkip = {
                        Toast.makeText(this, "App may not work properly in background without this permission", Toast.LENGTH_LONG).show()
                    }
                )
            }
        }
    }

    private fun showPermissionRequiredDialog(
        title: String,
        message: String,
        onRetry: () -> Unit,
        onSkip: () -> Unit
    ) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("Grant Permission") { dialog, _ ->
                dialog.dismiss()
                onRetry()
            }
            .setNegativeButton("Skip") { dialog, _ ->
                dialog.dismiss()
                onSkip()
            }
            .show()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        if (!hasLocationPermission()) return

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000 // 10 seconds
        ).apply {
            setMinUpdateIntervalMillis(5000) // 5 seconds
            setWaitForAccurateLocation(false)
        }.build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        // Get last known location immediately
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let { sendLocationToWebView(it) }
        }
    }

    private fun sendLocationToWebView(location: Location) {
        val javascript = """
            (function() {
                if (typeof window.updateLocation === 'function') {
                    window.updateLocation(${location.latitude}, ${location.longitude}, ${location.accuracy});
                }
                localStorage.setItem('last-location', JSON.stringify({
                    latitude: ${location.latitude},
                    longitude: ${location.longitude},
                    accuracy: ${location.accuracy},
                    timestamp: ${System.currentTimeMillis()}
                }));
                localStorage.setItem('location-permission', 'granted');
            })();
        """.trimIndent()

        runOnUiThread {
            binding.webView.evaluateJavascript(javascript, null)
        }
    }

    private fun checkDashboardAndRequestPermissions(url: String?) {
        // Check if user is on dashboard page
        if (!permissionsRequested && url != null && url.contains("/dashboard")) {
            permissionsRequested = true

            // Small delay to ensure page is fully loaded
            binding.webView.postDelayed({
                requestPermissions()
            }, 500)
        }
    }



    private fun openInCustomTab(url: String) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setUrlBarHidingEnabled(false)
                .build()

            customTabsIntent.launchUrl(this, Uri.parse(url))
        } catch (e: Exception) {
            // Fallback to regular browser if Custom Tabs not available
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            } catch (ex: Exception) {
                Toast.makeText(this, "Cannot open browser", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // JavaScript interface for location
    inner class LocationInterface {
        @JavascriptInterface
        fun requestLocation() {
            runOnUiThread {
                if (hasLocationPermission()) {
                    startLocationUpdates()
                } else {
                    requestLocationPermission()
                }
            }
        }

        @JavascriptInterface
        fun hasPermission(): Boolean {
            return hasLocationPermission()
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.data?.let { uri ->
            // Handle OAuth callback from Chrome Custom Tabs
            if (uri.toString().startsWith(URL)) {
                binding.webView.loadUrl(uri.toString())
            }
        }
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    // JavaScript Interface for Navigation Bar Color
    inner class NavigationBarInterface {
        @JavascriptInterface
        fun setNavigationBarColor(colorString: String) {
            runOnUiThread {
                try {
                    val color = parseColor(colorString)
                    window.navigationBarColor = color
                    Log.d("NavigationBar", "Color updated to: $colorString")
                } catch (e: Exception) {
                    Log.e("NavigationBar", "Failed to parse color: $colorString", e)
                }
            }
        }

        private fun parseColor(colorString: String): Int {
            // Handle rgb(r, g, b) format
            val rgbPattern = Regex("""rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)""")
            val rgbMatch = rgbPattern.find(colorString)
            if (rgbMatch != null) {
                val (r, g, b) = rgbMatch.destructured
                return Color.rgb(r.toInt(), g.toInt(), b.toInt())
            }

            // Handle rgba(r, g, b, a) format
            val rgbaPattern = Regex("""rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)""")
            val rgbaMatch = rgbaPattern.find(colorString)
            if (rgbaMatch != null) {
                val (r, g, b) = rgbaMatch.destructured
                return Color.rgb(r.toInt(), g.toInt(), b.toInt())
            }

            // Handle hex format (#RRGGBB or #RGB)
            if (colorString.startsWith("#")) {
                return Color.parseColor(colorString)
            }

            // Default to white if parsing fails
            return Color.parseColor("#FFFFFF")
        }
    }

    // JavaScript Interface for Notification Service
    inner class NotificationInterface {
        @JavascriptInterface
        fun startService(userId: String) {
            runOnUiThread {
                try {
                    NotificationService.start(this@MainActivity, userId)
                    Log.d("NotificationService", "Service started for user: $userId")
                } catch (e: Exception) {
                    Log.e("NotificationService", "Failed to start service", e)
                }
            }
        }

        @JavascriptInterface
        fun stopService() {
            runOnUiThread {
                try {
                    NotificationService.stop(this@MainActivity)
                    Log.d("NotificationService", "Service stopped")
                } catch (e: Exception) {
                    Log.e("NotificationService", "Failed to stop service", e)
                }
            }
        }
    }

    // JavaScript Interface for Firebase Cloud Messaging
    inner class FCMInterface {
        @JavascriptInterface
        fun registerToken(userId: String) {
            runOnUiThread {
                try {
                    // Get FCM token
                    FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            val token = task.result
                            Log.d("FCM", "✅ FCM Token: $token")
                            
                            // Send token to backend server
                            sendTokenToServer(userId, token)
                        } else {
                            Log.e("FCM", "❌ Failed to get FCM token", task.exception)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("FCM", "❌ Failed to register FCM token", e)
                }
            }
        }

        @JavascriptInterface
        fun logout() {
            runOnUiThread {
                try {
                    // Clear FCM token from backend
                    Log.d("FCM", "✅ Logging out - FCM token will be cleared from server")
                    // The web app will handle removing the token from backend
                } catch (e: Exception) {
                    Log.e("FCM", "❌ Failed to logout", e)
                }
            }
        }

        @JavascriptInterface
        fun getToken(callback: String) {
            runOnUiThread {
                try {
                    FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            val token = task.result
                            Log.d("FCM", "FCM Token: $token")

                            // Call JavaScript callback with token
                            binding.webView.evaluateJavascript(
                                "if (typeof $callback === 'function') { $callback('$token'); }",
                                null
                            )
                        } else {
                            Log.e("FCM", "❌ Failed to get token", task.exception)
                            binding.webView.evaluateJavascript(
                                "if (typeof $callback === 'function') { $callback(null); }",
                                null
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e("FCM", "❌ Error getting token", e)
                    binding.webView.evaluateJavascript(
                        "if (typeof $callback === 'function') { $callback(null); }",
                        null
                    )
                }
            }
        }

        private fun sendTokenToServer(userId: String, token: String) {
            try {
                // Get device information
                val deviceInfo = JSONObject().apply {
                    put("model", Build.MODEL)
                    put("osVersion", Build.VERSION.RELEASE)
                    put("appVersion", "1.0.1")
                }

                // Inject token into web app via JavaScript
                binding.webView.evaluateJavascript(
                    """
                    (function() {
                        if (window.handleFCMToken) {
                            window.handleFCMToken('$token', '$userId', $deviceInfo);
                        } else {
                            console.log('FCM Token ready:', '$token');
                        }
                    })();
                    """.trimIndent(),
                    null
                )

                Log.d("FCM", "✅ Token sent to web app for user: $userId")
            } catch (e: Exception) {
                Log.e("FCM", "❌ Failed to send token to server", e)
            }
        }
    }
}

