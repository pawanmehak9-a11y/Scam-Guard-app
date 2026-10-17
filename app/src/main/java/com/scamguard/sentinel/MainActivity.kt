package com.scamguard.sentinel

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Telephony
import android.telephony.TelephonyManager
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val STANDALONE_OFFLINE_URL = "file:///android_asset/index.html"
    private val PERMISSION_REQUEST_CODE = 2026
    private val NOTIFICATION_CHANNEL_ID = "scamguard_alerts"

    // Required permissions for active monitoring
    private val MONITORING_PERMISSIONS = arrayOf(
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.READ_SMS,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.VIBRATE
    ).let {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            it + Manifest.permission.POST_NOTIFICATIONS
        } else {
            it
        }
    }

    // Dynamic broadcast receiver for incoming SMS fraud detection
    private val smsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent?.action) {
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                for (sms in messages) {
                    val sender = sms.originatingAddress ?: "Unknown"
                    val messageBody = sms.messageBody ?: ""

                    runOnUiThread {
                        val jsPayload = messageBody.replace("'", "\\'").replace("\n", " ")
                        webView.evaluateJavascript(
                            "if (typeof onIncomingSmsIntercepted === 'function') { " +
                            "  onIncomingSmsIntercepted('$sender', '$jsPayload'); " +
                            "}", null
                        )
                    }
                }
            }
        }
    }

    // Dynamic broadcast receiver for incoming call state monitoring
    private val callReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (TelephonyManager.ACTION_PHONE_STATE_CHANGED == intent?.action) {
                val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: "Private Caller"

                if (state == TelephonyManager.EXTRA_STATE_RINGING) {
                    runOnUiThread {
                        webView.evaluateJavascript(
                            "if (typeof onIncomingCallIntercepted === 'function') { " +
                            "  onIncomingCallIntercepted('$incomingNumber'); " +
                            "}", null
                        )
                    }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        createNotificationChannel()
        setupWebView()
        registerInterceptionReceivers()

        // Start continuous background protection service
        try {
            BackgroundProtectionService.startService(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Prompt user for permissions on startup
        promptUserForMonitoringPermissions()
    }

    private fun setupWebView() {
        webView = findViewById(R.id.scamguard_webview)
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.addJavascriptInterface(AndroidNativeInterface(this), "AndroidNative")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                notifyWebviewOfPermissionStates()
            }
        }

        webView.loadUrl(STANDALONE_OFFLINE_URL)
    }

    fun promptUserForMonitoringPermissions() {
        val missingPermissions = MONITORING_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            AlertDialog.Builder(this)
                .setTitle("🛡️ Enable Active Fraud Protection")
                .setMessage("ScamGuard 360 requires Call & SMS permissions to monitor incoming phone calls and text messages for 'Digital Arrest' impersonation and phishing fraud in real-time.")
                .setPositiveButton("Grant Permissions") { _, _ ->
                    ActivityCompat.requestPermissions(
                        this,
                        missingPermissions.toTypedArray(),
                        PERMISSION_REQUEST_CODE
                    )
                }
                .setNegativeButton("Later", null)
                .show()
        } else {
            notifyWebviewOfPermissionStates()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        notifyWebviewOfPermissionStates()

        val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        if (allGranted) {
            Toast.makeText(this, "Active Shield Enabled: Calls & Messages are now protected!", Toast.LENGTH_LONG).show()
        }
    }

    private fun notifyWebviewOfPermissionStates() {
        val hasSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val hasPhone = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

        runOnUiThread {
            webView.evaluateJavascript(
                "if (typeof updatePermissionStatuses === 'function') { " +
                "  updatePermissionStatuses({ sms: $hasSms, phone: $hasPhone, audio: $hasAudio }); " +
                "}", null
            )
        }
    }

    private fun registerInterceptionReceivers() {
        val smsFilter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
        registerReceiver(smsReceiver, smsFilter)

        val callFilter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
        registerReceiver(callReceiver, callFilter)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "ScamGuard Emergency Fraud Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical alerts for intercepted phishing SMS and scam phone calls"
                enableVibration(true)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(smsReceiver)
            unregisterReceiver(callReceiver)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    inner class AndroidNativeInterface(private val context: Context) {
        @JavascriptInterface
        fun requestSystemPermissions() {
            runOnUiThread {
                promptUserForMonitoringPermissions()
            }
        }

        @JavascriptInterface
        fun triggerPanicVibration(intensity: Int) {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val timings = longArrayOf(0, 300, 100, 300, 100, 500)
                val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255)
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(1000)
            }
        }

        @JavascriptInterface
        fun sendHeadsUpNotification(title: String, message: String) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)

            notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
        }

        @JavascriptInterface
        fun startBackgroundProtectionService() {
            BackgroundProtectionService.startService(context)
        }

        @JavascriptInterface
        fun stopBackgroundProtectionService() {
            BackgroundProtectionService.stopService(context)
        }

        @JavascriptInterface
        fun showScamOverlayPopup(sender: String, body: String, title: String, score: Int, reason: String) {
            val popupIntent = Intent(context, ScamAlertPopupActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("sender", sender)
                putExtra("body", body)
                putExtra("title", title)
                putExtra("score", score)
                putExtra("reason", reason)
            }
            context.startActivity(popupIntent)
        }
    }
}
