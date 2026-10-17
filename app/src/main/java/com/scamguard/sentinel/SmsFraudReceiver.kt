package com.scamguard.sentinel

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Telephony
import androidx.core.app.NotificationCompat

/**
 * SmsFraudReceiver
 * Intercepts incoming SMS messages, runs heuristic rule checks,
 * triggers urgent popup alerts, and marks scam messages.
 */
class SmsFraudReceiver : BroadcastReceiver() {

    companion object {
        const val ALERT_CHANNEL_ID = "scamguard_urgent_alerts"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent?.action) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return

            for (sms in messages) {
                val sender = sms.originatingAddress ?: "Unknown Sender"
                val body = sms.messageBody ?: ""

                // Heuristic fraud analysis
                val threat = evaluateSmsFraud(body)

                if (threat.isScam) {
                    // 1. Trigger Vibration Panic
                    triggerEmergencyVibration(context)

                    // 2. Fire High-Priority Heads-Up Notification
                    sendHeadsUpScamAlert(context, sender, body, threat)

                    // 3. Launch Urgent Screen Pop-Up Dialog
                    launchScamPopup(context, sender, body, threat)

                    // 4. Save to Marked Scam History (SharedPreferences)
                    saveMarkedScam(context, sender, body, threat)
                }
            }
        }
    }

    data class ScamEvaluation(
        val isScam: Boolean,
        val riskScore: Int,
        val title: String,
        val reason: String
    )

    private fun evaluateSmsFraud(text: String): ScamEvaluation {
        val lower = text.lowercase()
        var score = 0
        var title = "Suspicious Message"
        var reason = "Unusual urgency or payment demand detected."

        // Electricity cutoff threat
        if ((lower.contains("electricity") || lower.contains("power") || lower.contains("bijli")) &&
            (lower.contains("disconnect") || lower.contains("cut off") || lower.contains("tonight") || lower.contains("9:30"))
        ) {
            score += 85
            title = "Tonight Electricity Disconnection Scam"
            reason = "State power boards never send cutoff deadlines from personal 10-digit mobile numbers."
        }

        // Bank / KYC freeze
        if ((lower.contains("account") || lower.contains("debit card") || lower.contains("netbanking")) &&
            (lower.contains("block") || lower.contains("suspend") || lower.contains("kyc") || lower.contains("pan"))
        ) {
            score += 90
            title = "Bank Account / KYC Deactivation Threat"
            reason = "Banks never threaten instant account suspension over unverified SMS links."
        }

        // Lottery / KBC
        if (lower.contains("kbc") || lower.contains("lottery") || lower.contains("25 lakh") || lower.contains("won prize")) {
            score += 90
            title = "Fake KBC / Lottery Prize Scam"
            reason = "Classic prize extortion scheme asking for advance processing fees."
        }

        // YouTube / Telegram task scam
        if ((lower.contains("earn") || lower.contains("daily income")) &&
            (lower.contains("like") || lower.contains("youtube") || lower.contains("telegram"))
        ) {
            score += 80
            title = "Telegram Part-Time Task Scam"
            reason = "Fraudulent prepaid task investment trap."
        }

        // Suspicious Phishing TLDs or Raw IP
        if (lower.contains(".xyz") || lower.contains(".top") || lower.contains(".site") || lower.contains(".cc") ||
            Regex("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b").containsMatchIn(lower)
        ) {
            score += 40
            if (score < 80) {
                title = "Phishing Link in Message"
                reason = "Message contains an unverified, dangerous domain or numeric IP host."
            }
        }

        return ScamEvaluation(
            isScam = score >= 50,
            riskScore = score.coerceAtMost(100),
            title = title,
            reason = reason
        )
    }

    private fun triggerEmergencyVibration(context: Context) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    VibrationEffect.createWaveform(
                        longArrayOf(0, 300, 100, 300, 100, 500),
                        intArrayOf(0, 255, 0, 255, 0, 255),
                        -1
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(1000)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun sendHeadsUpScamAlert(
        context: Context,
        sender: String,
        body: String,
        threat: ScamEvaluation
    ) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "🚨 Critical Scam & Fraud Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent heads-up alerts when fraudulent messages or scam calls are intercepted"
                enableVibration(true)
                setShowBadge(true)
            }
            manager.createNotificationChannel(channel)
        }

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_INTERCEPTED_SENDER", sender)
            putExtra("EXTRA_INTERCEPTED_BODY", body)
            putExtra("EXTRA_INTERCEPTED_TITLE", threat.title)
            putExtra("EXTRA_INTERCEPTED_SCORE", threat.riskScore)
        }

        val pendingIntent = PendingIntent.getActivity(
            context, System.currentTimeMillis().toInt(), openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_error)
            .setContentTitle("🚨 SCAM DETECTED: ${threat.title}")
            .setContentText("From $sender: DO NOT call or click links! Tap to view.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("⚠️ From: $sender\n\n\"$body\"\n\n💡 ${threat.reason}\n\n🛑 Real officials NEVER ask for money or send cutoff threats over SMS."))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        manager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
    }

    private fun launchScamPopup(
        context: Context,
        sender: String,
        body: String,
        threat: ScamEvaluation
    ) {
        try {
            val popupIntent = Intent(context, ScamAlertPopupActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("sender", sender)
                putExtra("body", body)
                putExtra("title", threat.title)
                putExtra("score", threat.riskScore)
                putExtra("reason", threat.reason)
            }
            context.startActivity(popupIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun saveMarkedScam(
        context: Context,
        sender: String,
        body: String,
        threat: ScamEvaluation
    ) {
        try {
            val prefs = context.getSharedPreferences("scamguard_marked_scams", Context.MODE_PRIVATE)
            val count = prefs.getInt("count", 0) + 1
            prefs.edit()
                .putInt("count", count)
                .putString("scam_${count}_sender", sender)
                .putString("scam_${count}_body", body)
                .putString("scam_${count}_title", threat.title)
                .putInt("scam_${count}_score", threat.riskScore)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
