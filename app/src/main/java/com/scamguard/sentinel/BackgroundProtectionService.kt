package com.scamguard.sentinel

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.provider.Telephony
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat

/**
 * BackgroundProtectionService
 * Continuous foreground service that monitors SMS and phone calls for fraud
 * even when the ScamGuard app is minimized or closed.
 */
class BackgroundProtectionService : Service() {

    companion object {
        const val CHANNEL_ID = "scamguard_bg_service_channel"
        const val NOTIFICATION_ID = 1001

        fun startService(context: Context) {
            val intent = Intent(context, BackgroundProtectionService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, BackgroundProtectionService::class.java)
            context.stopService(intent)
        }
    }

    private val smsReceiver = SmsFraudReceiver()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())

        // Register broadcast receiver dynamically for active background monitoring
        val smsFilter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply {
            priority = 999
        }
        registerReceiver(smsReceiver, smsFilter)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY // Restart automatically if system kills it for memory
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(smsReceiver)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ScamGuard Active Background Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps ScamGuard sentinel running silently in background to auto-intercept fraud"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification() =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡️ ScamGuard Sentinel Active")
            .setContentText("Automatic background monitoring running: Calls & SMS protected")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setContentIntent(
                PendingIntent.getActivity(
                    this, 0,
                    Intent(this, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            )
            .build()
}
