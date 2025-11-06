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
import android.util.Log
import android.view.View
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import com.google.android.gms.location.*
import com.onesignal.OneSignal
import sbs.zenova.twa.databinding.ActivityMainBinding
import sbs.zenova.twa.services.NotificationService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    companion object {
        private const val URL = "https://zenova.sbs"
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
        if (isGranted) {
            Toast.makeText(this, "Notification permission granted", Toast.LENGTH_SHORT).show()
        } else {
            showPermissionDeniedDialog("Notifications")
        }
    }

    // Location permission launcher
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineLocationGranted || coarseLocationGranted) {
            startLocationUpdates()
            geolocationCallback?.invoke(geolocationOrigin, true, false)
        } else {
            geolocationCallback?.invoke(geolocationOrigin, false, false)
            showPermissionDeniedDialog("Location")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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

        // Don't request permissions on startup - wait for dashboard
        // requestPermissions()

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

        // Set TRANSPARENT navigation bar
        window.navigationBarColor = Color.TRANSPARENT

        // Disable navigation bar contrast enforcement (Android 10+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }

        // Set light navigation bar icons (Android 8.0+)
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

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url.toString()
                    return if (url.startsWith(URL)) {
                        false
                    } else {
                        // Open external links in browser
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
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

                                // Default to #192A5A if not found
                                return 'rgb(25, 42, 90)';
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

                            // Start notification service when user is logged in
                            function startNotificationService() {
                                try {
                                    const userId = localStorage.getItem('userId');
                                    if (userId && window.AndroidNotifications) {
                                        window.AndroidNotifications.startService(userId);
                                        console.log('Notification service started for user:', userId);
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

                    // Inject OneSignal player ID into the page
                    injectOneSignalPlayerId()

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
        // Request notification permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Request location permission
        if (!hasLocationPermission()) {
            requestLocationPermission()
        } else {
            startLocationUpdates()
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestLocationPermission() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        // Add background location for Android 10+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }

        locationPermissionLauncher.launch(permissions.toTypedArray())
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

    private fun injectOneSignalPlayerId() {
        val playerId = OneSignal.User.pushSubscription.id
        if (!playerId.isNullOrEmpty()) {
            val javascript = """
                (function() {
                    localStorage.setItem('onesignal_player_id', '$playerId');
                    if (typeof window.onOneSignalPlayerIdReceived === 'function') {
                        window.onOneSignalPlayerIdReceived('$playerId');
                    }
                })();
            """.trimIndent()

            binding.webView.evaluateJavascript(javascript, null)
        }
    }

    private fun showPermissionDeniedDialog(permissionName: String) {
        AlertDialog.Builder(this)
            .setTitle("Permission Required")
            .setMessage("$permissionName permission is required for this app to function properly. Please enable it in Settings.")
            .setPositiveButton("Settings") { _, _ ->
                val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
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

            // Default to #192A5A if parsing fails
            return Color.parseColor("#192A5A")
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
}

