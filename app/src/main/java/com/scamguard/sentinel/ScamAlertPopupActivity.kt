package com.scamguard.sentinel

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * ScamAlertPopupActivity
 * Transparent overlay dialog activity that pops up over the user's screen
 * when a critical scam message, link, or call is intercepted in the background.
 */
class ScamAlertPopupActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scam_popup)

        val sender = intent.getStringExtra("sender") ?: "Unknown Sender"
        val body = intent.getStringExtra("body") ?: ""
        val title = intent.getStringExtra("title") ?: "Scam Detected"
        val score = intent.getIntExtra("score", 90)
        val reason = intent.getStringExtra("reason") ?: "High threat fraudulent pattern detected."

        val titleView = findViewById<TextView>(R.id.popup_title)
        val sourceView = findViewById<TextView>(R.id.popup_source)
        val badgeView = findViewById<TextView>(R.id.popup_badge)
        val bodyView = findViewById<TextView>(R.id.popup_message_body)
        val reasonView = findViewById<TextView>(R.id.popup_reason)

        val btnVault = findViewById<Button>(R.id.btn_popup_vault)
        val btnSos = findViewById<Button>(R.id.btn_popup_sos)
        val btnDismiss = findViewById<Button>(R.id.btn_popup_dismiss)

        titleView?.text = title
        sourceView?.text = "💬 Intercepted from: $sender"
        badgeView?.text = "🔴 DANGEROUS SCAM ($score/100)"
        bodyView?.text = "\"$body\""
        reasonView?.text = "💡 Why this is fake: $reason"

        btnVault?.setOnClickListener {
            Toast.makeText(this, "🚩 Message permanently marked as SCAM in your Vault!", Toast.LENGTH_LONG).show()
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("NAVIGATE_TO", "tab-vault")
            }
            startActivity(mainIntent)
            finish()
        }

        btnSos?.setOnClickListener {
            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930"))
            startActivity(dialIntent)
            finish()
        }

        btnDismiss?.setOnClickListener {
            finish()
        }
    }
}
