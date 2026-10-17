/**
 * ScamGuard 360 Sentinel - Frontend Controller
 * Handles real-time speech recognition, API communication,
 * audio sirens (Web Audio API), presets, and quiz interaction.
 */

// Global State
let soundEnabled = true;
let isRecording = false;
let speechRecognizer = null;
let lastAnalyzedThreat = null;
let demoPresets = {};

// Initialize Web Audio Context for Emergency Siren
let audioCtx = null;
function playThreatSound(severity) {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();

    if (severity >= 60) {
      // High-pitch dual-tone Siren
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.6);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.7);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (severity >= 30) {
      // Caution Beep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn("Audio alert failed:", e);
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".mobile-nav-item").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

  const targetBtn = document.querySelector(`.tab-btn[data-target="${tabId}"]`);
  const targetMobile = document.querySelector(`.mobile-nav-item[data-target="${tabId}"]`);
  const targetPanel = document.getElementById(tabId);
  
  if (targetBtn) targetBtn.classList.add("active");
  if (targetMobile) targetMobile.classList.add("active");
  if (targetPanel) targetPanel.classList.add("active");

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Android Tactile Vibration API
function triggerAndroidHaptics(severity) {
  if ('vibrate' in navigator) {
    try {
      if (severity >= 60) {
        // Urgent panic cadence: buzz-buzz-buzz
        navigator.vibrate([250, 100, 250, 100, 500]);
      } else if (severity >= 30) {
        // Warning tap
        navigator.vibrate([150, 100, 150]);
      }
    } catch (e) {
      console.warn("Haptics unavailable", e);
    }
  }
}

// Render Risk Score UI
function renderThreatResults(prefix, result) {
  const scoreNum = document.getElementById(`${prefix}-score-num`);
  const scoreBadge = document.getElementById(`${prefix}-score-badge`);
  const progressBar = document.getElementById(`${prefix}-progress-bar`);
  const findingsList = document.getElementById(`${prefix}-findings`);
  const actionText = document.getElementById(`${prefix}-action-text`);
  const alertBanner = document.getElementById("global-alert-banner");

  const score = result.risk_score || 0;
  scoreNum.textContent = score;
  progressBar.style.width = `${score}%`;

  // Color classes
  scoreNum.className = "score-number";
  scoreBadge.className = "threat-badge";
  progressBar.className = "progress-bar";

  if (score >= 60) {
    scoreNum.classList.add("severity-danger");
    scoreBadge.classList.add("severity-danger-bg");
    progressBar.style.backgroundColor = "var(--accent-red)";
    scoreBadge.textContent = "🚨 DANGEROUS SCAM! DO NOT TRUST";
    if (alertBanner) {
      alertBanner.className = "alert-banner critical";
      document.getElementById("banner-title").textContent = "HIGH SEVERITY SCAM ALERT TRIGGERED!";
      document.getElementById("banner-desc").textContent = result.summary || "Dangerous scam pattern or credential theft trap identified.";
    }
    playThreatSound(score);
    triggerAndroidHaptics(score);
  } else if (score >= 30) {
    scoreNum.classList.add("severity-warn");
    scoreBadge.classList.add("severity-warn-bg");
    progressBar.style.backgroundColor = "var(--accent-amber)";
    scoreBadge.textContent = "⚠️ SUSPICIOUS - BE CAREFUL";
    if (alertBanner) alertBanner.className = "alert-banner";
    playThreatSound(score);
    triggerAndroidHaptics(score);
  } else {
    scoreNum.classList.add("severity-safe");
    scoreBadge.classList.add("severity-safe-bg");
    progressBar.style.backgroundColor = "var(--accent-green)";
    scoreBadge.textContent = "✅ SAFE - NO THREAT FOUND";
    if (alertBanner) alertBanner.className = "alert-banner";
  }

  // Populate Findings
  findingsList.innerHTML = "";

  // Call findings
  if (result.flagged_categories) {
    result.flagged_categories.forEach(cat => {
      const item = document.createElement("div");
      item.className = "finding-item danger";
      item.innerHTML = `<div class="finding-title">⚠️ ${cat.name}</div>
                        <div class="finding-desc">${cat.description} (Triggered by: <em>${cat.matched_keywords.join(", ")}</em>)</div>`;
      findingsList.appendChild(item);
    });
  }

  // Psychological tactics
  if (result.psychological_tactics && result.psychological_tactics.length > 0) {
    const item = document.createElement("div");
    item.className = "finding-item warning";
    item.innerHTML = `<div class="finding-title">🧠 Psychological Coercion Tactics</div>
                      <div class="finding-desc">${result.psychological_tactics.join(" • ")}</div>`;
    findingsList.appendChild(item);
  }

  // URL indicators
  if (result.indicators) {
    result.indicators.forEach(ind => {
      const item = document.createElement("div");
      const sevClass = ind.severity === "CRITICAL" ? "danger" : "warning";
      item.className = `finding-item ${sevClass}`;
      item.innerHTML = `<div class="finding-title">🔍 ${ind.title}</div>
                        <div class="finding-desc">${ind.details}</div>`;
      findingsList.appendChild(item);
    });
  }

  // Message elements
  if (result.flagged_elements) {
    result.flagged_elements.forEach(elem => {
      const item = document.createElement("div");
      item.className = "finding-item danger";
      item.innerHTML = `<div class="finding-title">🚩 Suspicious Marker</div>
                        <div class="finding-desc">${elem}</div>`;
      findingsList.appendChild(item);
    });
  }

  if (findingsList.children.length === 0) {
    const item = document.createElement("div");
    item.className = "finding-item safe";
    item.innerHTML = `<div class="finding-title">🛡️ Clean Scan</div>
                      <div class="finding-desc">No deceptive social engineering markers or malicious payloads detected.</div>`;
    findingsList.appendChild(item);
  }

  // Action text
  if (actionText) {
    actionText.textContent = result.recommended_action || "Stay vigilant.";
  }

  // Store for complaint generator
  lastAnalyzedThreat = {
    type: prefix,
    data: result
  };
}

// 1. Analyze Call
async function analyzeCallTranscript() {
  const text = document.getElementById("call-transcript-input").value;
  if (!text.trim()) {
    alert("Please provide or speak a call transcript to analyze.");
    return;
  }

  try {
    const res = await fetch("/api/analyze/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text })
    });
    if (!res.ok) throw new Error("Server response error");
    const data = await res.json();
    renderThreatResults("call", data);
  } catch (err) {
    console.warn("Backend unavailable, executing offline detector...", err);
    if (typeof analyzeCallOffline === "function") {
      const offlineData = analyzeCallOffline(text);
      renderThreatResults("call", offlineData);
    } else {
      alert("Call analysis failed: " + err.message);
    }
  }
}

// Speech Recognition for live call transcription
function toggleLiveSpeech() {
  const micBtn = document.getElementById("mic-record-btn");
  const transcriptArea = document.getElementById("call-transcript-input");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition API is not supported in this browser. Please use Google Chrome, Edge, or paste your call transcript directly.");
    return;
  }

  if (isRecording) {
    if (speechRecognizer) speechRecognizer.stop();
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtn.innerHTML = "🎙️ Live Voice Call";
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = "en-US";

  speechRecognizer.onstart = () => {
    isRecording = true;
    micBtn.classList.add("recording");
    micBtn.innerHTML = "⏹️ Listening...";
  };

  speechRecognizer.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        transcriptArea.value += " " + event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    // Auto-analyze periodically
    analyzeCallTranscript();
  };

  speechRecognizer.onerror = (e) => {
    console.error("Speech error", e);
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtn.innerHTML = "🎙️ Live Voice Call";
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtn.innerHTML = "🎙️ Live Voice Call";
  };

  speechRecognizer.start();
}

// 2. Analyze URL
async function analyzeUrlInput() {
  const url = document.getElementById("url-input").value;
  if (!url.trim()) {
    alert("Please provide a website URL to scan.");
    return;
  }

  try {
    const res = await fetch("/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });
    if (!res.ok) throw new Error("Server response error");
    const data = await res.json();
    renderThreatResults("url", data);
  } catch (err) {
    console.warn("Backend unavailable, executing offline URL detector...", err);
    if (typeof analyzeUrlOffline === "function") {
      const offlineData = analyzeUrlOffline(url);
      renderThreatResults("url", offlineData);
    } else {
      alert("URL analysis failed: " + err.message);
    }
  }
}

// 3. Analyze Message
async function analyzeMessageInput() {
  const msg = document.getElementById("message-input").value;
  if (!msg.trim()) {
    alert("Please enter message text to scan.");
    return;
  }

  try {
    const res = await fetch("/api/analyze/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });
    if (!res.ok) throw new Error("Server response error");
    const data = await res.json();
    renderThreatResults("msg", data);
  } catch (err) {
    console.warn("Backend unavailable, executing offline message detector...", err);
    if (typeof analyzeMessageOffline === "function") {
      const offlineData = analyzeMessageOffline(msg);
      renderThreatResults("msg", offlineData);
    } else {
      alert("Message analysis failed: " + err.message);
    }
  }
}

// 4. Generate Cybercrime Complaint Report
async function generateReport() {
  if (!lastAnalyzedThreat) {
    alert("Please perform a Call, URL, or Message threat scan first before generating an incident report.");
    return;
  }

  let raw = "";
  if (lastAnalyzedThreat.type === "call") {
    raw = document.getElementById("call-transcript-input").value;
  } else if (lastAnalyzedThreat.type === "url") {
    raw = document.getElementById("url-input").value;
  } else {
    raw = document.getElementById("message-input").value;
  }

  try {
    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incident_type: lastAnalyzedThreat.type,
        raw_input: raw,
        threat_data: lastAnalyzedThreat.data
      })
    });
    if (!res.ok) throw new Error("Offline mode");
    const reportData = await res.json();
    document.getElementById("complaint-text").textContent = reportData.formatted_complaint;
    switchTab("tab-report");
  } catch (err) {
    if (typeof generateComplaintOffline === "function") {
      const rep = generateComplaintOffline(lastAnalyzedThreat.type, raw, lastAnalyzedThreat.data || {});
      document.getElementById("complaint-text").textContent = rep.formatted_complaint;
      switchTab("tab-report");
    } else {
      alert("Report generation failed: " + err.message);
    }
  }
}

function copyReport() {
  const text = document.getElementById("complaint-text").textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    alert("Official incident complaint copied to clipboard! You can paste this on cybercrime.gov.in or report to 1930.");
  });
}

// 5. Load Presets for Demos (Instant offline load)
async function loadPresets() {
  let presets = (typeof LOCAL_PRESETS !== "undefined") ? LOCAL_PRESETS : {};
  try {
    const res = await fetch("/api/presets");
    if (res.ok) {
      presets = await res.json();
    }
  } catch (e) {
    console.log("Using offline preset database");
  }

  // Call presets
  const callPresetsBar = document.getElementById("call-presets");
  if (callPresetsBar && presets.calls) {
    callPresetsBar.innerHTML = "";
    presets.calls.forEach(c => {
      const chip = document.createElement("span");
      chip.className = "preset-chip";
      chip.textContent = c.title;
      chip.onclick = () => {
        document.getElementById("call-transcript-input").value = c.text;
        analyzeCallTranscript();
      };
      callPresetsBar.appendChild(chip);
    });
  }

  // URL presets
  const urlPresetsBar = document.getElementById("url-presets");
  if (urlPresetsBar && presets.urls) {
    urlPresetsBar.innerHTML = "";
    presets.urls.forEach(u => {
      const chip = document.createElement("span");
      chip.className = "preset-chip";
      chip.textContent = u.title;
      chip.onclick = () => {
        document.getElementById("url-input").value = u.url;
        analyzeUrlInput();
      };
      urlPresetsBar.appendChild(chip);
    });
  }

  // Message presets
  const msgPresetsBar = document.getElementById("msg-presets");
  if (msgPresetsBar && presets.messages) {
    msgPresetsBar.innerHTML = "";
    presets.messages.forEach(m => {
      const chip = document.createElement("span");
      chip.className = "preset-chip";
      chip.textContent = m.title;
      chip.onclick = () => {
        document.getElementById("message-input").value = m.text;
        analyzeMessageInput();
      };
      msgPresetsBar.appendChild(chip);
    });
  }
}

// 6. Load Scam Awareness & Quiz (Instant offline load)
async function loadAwarenessContent() {
  let cases = (typeof LOCAL_CASE_STUDIES !== "undefined") ? LOCAL_CASE_STUDIES : [];
  let questions = (typeof LOCAL_QUIZ_QUESTIONS !== "undefined") ? LOCAL_QUIZ_QUESTIONS : [];

  try {
    const casesRes = await fetch("/api/scam-cases");
    if (casesRes.ok) {
      const data = await casesRes.json();
      if (data.cases) cases = data.cases;
    }
  } catch (e) {}

  try {
    const quizRes = await fetch("/api/quiz");
    if (quizRes.ok) {
      const qdata = await quizRes.json();
      if (qdata.questions) questions = qdata.questions;
    }
  } catch (e) {}

  // Render Case Studies
  const caseContainer = document.getElementById("case-studies-container");
  if (caseContainer && cases.length > 0) {
    caseContainer.innerHTML = "";
    cases.forEach(cs => {
      const card = document.createElement("div");
      card.className = "case-card";
      card.innerHTML = `
        <div>
          <h4>${cs.title}</h4>
          <p><strong>Modus Operandi:</strong> ${cs.modus_operandi}</p>
        </div>
        <div>
          <div class="case-rule">💡 <strong>Golden Rule:</strong> ${cs.golden_rule}</div>
        </div>
      `;
      caseContainer.appendChild(card);
    });
  }

  // Render Quiz
  const quizContainer = document.getElementById("quiz-container");
  if (quizContainer && questions.length > 0) {
    quizContainer.innerHTML = "";
    questions.forEach((q, qIdx) => {
      const qCard = document.createElement("div");
      qCard.className = "quiz-card";

      let optionsHtml = "";
      q.options.forEach((opt, optIdx) => {
        optionsHtml += `<button class="quiz-opt-btn" onclick="checkAnswer(${qIdx}, ${optIdx}, ${q.correct_index}, this)">
          ${String.fromCharCode(65 + optIdx)}. ${opt}
        </button>`;
      });

      qCard.innerHTML = `
        <div class="quiz-question">Q${q.id}: ${q.question}</div>
        <div class="quiz-options">${optionsHtml}</div>
        <div class="quiz-explanation" id="quiz-exp-${qIdx}">${q.explanation}</div>
      `;
      quizContainer.appendChild(qCard);
    });
  }
}

function checkAnswer(qIdx, selectedIdx, correctIdx, btnElem) {
  const parent = btnElem.parentElement;
  const buttons = parent.querySelectorAll(".quiz-opt-btn");
  buttons.forEach(b => b.disabled = true);

  if (selectedIdx === correctIdx) {
    btnElem.classList.add("correct");
  } else {
    btnElem.classList.add("wrong");
    buttons[correctIdx].classList.add("correct");
  }

  const exp = document.getElementById(`quiz-exp-${qIdx}`);
  if (exp) {
    exp.style.display = "block";
    exp.style.borderLeft = selectedIdx === correctIdx ? "3px solid var(--accent-green)" : "3px solid var(--accent-red)";
  }
}

// Toggle Siren Audio
function toggleSiren() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("siren-btn");
  if (soundEnabled) {
    btn.classList.add("active");
    btn.innerHTML = "🔊 Siren ON";
  } else {
    btn.classList.remove("active");
    btn.innerHTML = "🔇 Siren OFF";
  }
}

// Android Web Share API for Incident Reports
function shareReportToAndroid() {
  const text = document.getElementById("complaint-text").textContent;
  if (!text || text.includes("Click \"Generate Cybercrime Report\"")) {
    alert("Please scan a call, website, or message first to generate a report.");
    return;
  }

  if (navigator.share) {
    navigator.share({
      title: "ScamGuard 360 Cyber Incident Alert",
      text: text,
      url: window.location.href
    }).catch(err => console.log("Native share skipped", err));
  } else {
    copyReport();
  }
}

// QR Code Modal for Android Phone Linking
async function openQrModal() {
  const modal = document.getElementById("qr-modal");
  const urlBox = document.getElementById("mobile-url-text");
  const qrImg = document.getElementById("qr-image");

  if (modal) modal.classList.add("active");

  try {
    const res = await fetch("/api/device-info");
    const data = await res.json();
    if (urlBox) urlBox.textContent = data.mobile_url;
    if (qrImg) qrImg.src = "/api/qr-code?t=" + new Date().getTime();
  } catch (e) {
    if (urlBox) urlBox.textContent = window.location.origin;
  }
}

function closeQrModal() {
  const modal = document.getElementById("qr-modal");
  if (modal) modal.classList.remove("active");
}

// Android PWA Installation Logic
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById("install-pwa-btn");
  if (installBtn) installBtn.classList.add("visible");
});

async function installPwa() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log("PWA install outcome:", outcome);
    deferredInstallPrompt = null;
    const installBtn = document.getElementById("install-pwa-btn");
    if (installBtn) installBtn.classList.remove("visible");
  } else {
    alert("To install on Android: In Chrome, tap the 3-dots menu (⋮) -> 'Add to Home screen' or 'Install App'.");
  }
}

// Service Worker Registration for Android PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log("ScamGuard PWA ServiceWorker active", reg.scope),
      (err) => console.log("PWA ServiceWorker registration failed", err)
    );
  });
}

// Boot up listeners
document.addEventListener("DOMContentLoaded", () => {
  // Tab buttons (desktop)
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-target"));
    });
  });

  // Mobile Bottom Nav items (Android)
  document.querySelectorAll(".mobile-nav-item").forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.getAttribute("data-target"));
    });
  });

  loadPresets();
  loadAwarenessContent();
  updateVaultCounters();
  renderScamVault();
});

// Auto-scan clipboard on app resume / window focus
window.addEventListener("focus", () => {
  if (isMonitoringActive && typeof autoCheckClipboard === "function") {
    autoCheckClipboard();
  }
});

// ========================================================
// PERMISSIONS HUB & REAL-TIME INTERCEPTOR CONTROLS
// ========================================================
let isMonitoringActive = true;

// Request Permissions from User
async function requestSystemPermissions() {
  if (window.AndroidNative && typeof window.AndroidNative.requestSystemPermissions === "function") {
    window.AndroidNative.requestSystemPermissions();
    return;
  }

  // Web API Permission Prompts
  try {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      const notifyBadge = document.getElementById("perm-notify-badge");
      if (notifyBadge) {
        notifyBadge.textContent = perm === "granted" ? "ACTIVE" : "DENIED";
        notifyBadge.className = perm === "granted" ? "perm-badge active" : "perm-badge pending";
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioBadge = document.getElementById("perm-audio-badge");
      if (audioBadge) {
        audioBadge.textContent = "ACTIVE";
        audioBadge.className = "perm-badge active";
      }
    }

    alert("Permissions Updated: Real-time fraud detection is active!");
  } catch (err) {
    console.warn("Permission request error:", err);
  }
}

function updatePermissionStatuses(perms) {
  if (!perms) return;
  const phoneBadge = document.getElementById("perm-phone-badge");
  const smsBadge = document.getElementById("perm-sms-badge");
  const audioBadge = document.getElementById("perm-audio-badge");

  if (phoneBadge) {
    phoneBadge.textContent = perms.phone ? "ACTIVE" : "PENDING";
    phoneBadge.className = perms.phone ? "perm-badge active" : "perm-badge pending";
  }
  if (smsBadge) {
    smsBadge.textContent = perms.sms ? "ACTIVE" : "PENDING";
    smsBadge.className = perms.sms ? "perm-badge active" : "perm-badge pending";
  }
  if (audioBadge) {
    audioBadge.textContent = perms.audio ? "ACTIVE" : "PENDING";
    audioBadge.className = perms.audio ? "perm-badge active" : "perm-badge pending";
  }
}

function toggleActiveMonitoring() {
  isMonitoringActive = !isMonitoringActive;
  const btn = document.getElementById("btn-toggle-monitor");
  const radarText = document.getElementById("radar-status-text");

  if (isMonitoringActive) {
    btn.innerHTML = "⏸️ Pause Shield";
    btn.className = "btn btn-secondary";
    radarText.textContent = "SURVEILLANCE RADAR ENGAGED";
    radarText.style.color = "var(--accent-cyan)";
  } else {
    btn.innerHTML = "▶️ Resume Shield";
    btn.className = "btn btn-primary";
    radarText.textContent = "SURVEILLANCE TEMPORARILY PAUSED";
    radarText.style.color = "var(--accent-amber)";
  }
}

function appendInterceptorLog(type, sender, title, details, severity) {
  const list = document.getElementById("interceptor-log-list");
  if (!list) return;

  const item = document.createElement("div");
  const time = new Date().toLocaleTimeString();
  item.className = `finding-item ${severity}`;
  item.innerHTML = `
    <div class="finding-title" style="display: flex; justify-content: space-between;">
      <span>${type}: ${sender}</span>
      <span style="font-size: 0.72rem; color: var(--text-muted);">${time}</span>
    </div>
    <div class="finding-desc"><strong>${title}</strong> — ${details}</div>
  `;
  list.insertBefore(item, list.firstChild);
}

// Interception Event from Android Native SMS Receiver
function onIncomingSmsIntercepted(sender, text) {
  if (!isMonitoringActive) return;
  console.log("Intercepted SMS from", sender, text);

  // Run real-time detection
  const result = typeof analyzeMessageOffline === "function" ? analyzeMessageOffline(text) : { risk_score: 50 };
  const sevClass = result.risk_score >= 60 ? "danger" : (result.risk_score >= 30 ? "warning" : "safe");

  appendInterceptorLog("💬 INCOMING SMS", sender, `Threat Score: ${result.risk_score}/100`, text.substring(0, 90) + "...", sevClass);

  if (result.risk_score >= 40) {
    // Show urgent Heads-Up Pop-Up Modal and auto-mark scam
    showScamAlertPopup({
      type: "sms",
      source: `SMS from ${sender}`,
      sourceIcon: "💬",
      title: result.flagged_elements && result.flagged_elements[0] ? result.flagged_elements[0] : "Scam Message Intercepted",
      snippet: text,
      risk_score: result.risk_score,
      threat_level: result.threat_level || "CRITICAL SCAM",
      reason: result.summary || "Suspicious fraudulent extortion or deceptive link detected."
    });

    if (window.AndroidNative && typeof window.AndroidNative.sendHeadsUpNotification === "function") {
      window.AndroidNative.sendHeadsUpNotification(
        "🚨 SCAMGUARD ALERT: SCAM SMS DETECTED!",
        `Dangerous phishing message from ${sender}. Do not call or click links.`
      );
    }
  }
}

// Interception Event from Android Native Call State Receiver
function onIncomingCallIntercepted(number) {
  if (!isMonitoringActive) return;
  console.log("Intercepted incoming call from", number);
  appendInterceptorLog("📞 INCOMING CALL", number, "Analyzing Caller Risk Pattern", "Live audio fraud monitoring primed.", "warning");
}

// 4 Full Simulation Scenarios with Urgent Pop-up Alerts
function simulateInterceptedSms() {
  const spoofSender = "+91 98721-34560 (Electricity Fraud)";
  const scamSms = "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer Rahul at 9872134560.";

  appendInterceptorLog("💬 INCOMING SMS", spoofSender, "🚨 FRAUD SMS INTERCEPTED (Score: 90/100)", "Tonight electricity cutoff threat detected.", "danger");

  document.getElementById("message-input").value = scamSms;

  showScamAlertPopup({
    type: "sms",
    source: `SMS from ${spoofSender}`,
    sourceIcon: "💬",
    title: "Tonight 9:30 PM Electricity Cutoff Threat",
    snippet: scamSms,
    risk_score: 90,
    threat_level: "CRITICAL SCAM DETECTED",
    reason: "Electricity boards never send disconnection threats from personal 10-digit mobile numbers with sudden deadlines."
  });
}

function simulateSmsPhishingLink() {
  const spoofSender = "VK-SBIINB";
  const scamSms = "Dear SBI Customer, your NetBanking and debit card access is blocked due to incomplete KYC. Please click http://sbi-netbanking-verify-kyc.top/secure to update your PAN and prevent account freeze.";

  appendInterceptorLog("🌐 SMS WITH LINK", spoofSender, "🚨 PHISHING LINK INTERCEPTED (Score: 100/100)", "Deceptive SBI banking credential harvester.", "danger");

  document.getElementById("message-input").value = scamSms;

  showScamAlertPopup({
    type: "links",
    source: `SMS from ${spoofSender}`,
    sourceIcon: "🌐",
    title: "Fake SBI NetBanking Phishing Portal",
    snippet: scamSms,
    risk_score: 100,
    threat_level: "CRITICAL PHISHING LINK",
    reason: "Deceptive domain '.top' posing as State Bank of India to steal confidential passwords and OTPs."
  });
}

function simulateClipboardScan() {
  const copiedUrl = "http://185.193.125.44/paypal-update-account/auth";
  appendInterceptorLog("📋 CLIPBOARD RADAR", "Copied Link from WhatsApp", "🚨 PHISHING URL CAUGHT (Score: 100/100)", "Raw IP address host with deceptive login page.", "danger");

  document.getElementById("url-input").value = copiedUrl;

  showScamAlertPopup({
    type: "links",
    source: "Copied Link from Clipboard (WhatsApp)",
    sourceIcon: "📋",
    title: "Malicious Raw IP Phishing Link",
    snippet: copiedUrl,
    risk_score: 100,
    threat_level: "CRITICAL PHISHING LINK",
    reason: "Raw IP address web hosting. Legitimate banks and payment services never host login pages on numeric IP addresses."
  });
}

function simulateInterceptedCall() {
  const spoofNumber = "+91 98210-99812 (Spoofed CBI Officer)";
  const scamSpeech = "I am Officer Vikram calling from CBI Narcotics Bureau Mumbai. A FedEx parcel sent to Taiwan in your name contains drugs. You are placed under digital arrest right now. Do not disconnect!";

  appendInterceptorLog("📞 INCOMING CALL", spoofNumber, "🚨 CRITICAL SCAM CALL (Score: 89/100)", "Digital Arrest Impersonation & Extortion signature.", "danger");

  document.getElementById("call-transcript-input").value = scamSpeech;

  showScamAlertPopup({
    type: "calls",
    source: `Incoming Call from ${spoofNumber}`,
    sourceIcon: "📞",
    title: "Fake CBI Police Digital Arrest Impersonation",
    snippet: scamSpeech,
    risk_score: 89,
    threat_level: "CRITICAL DIGITAL ARREST FRAUD",
    reason: "Real Police, CBI, Customs, or Courts NEVER conduct arrests or demand money transfers over Skype/WhatsApp video calls."
  });
}

function simulateSafeCall() {
  const familyNumber = "+91 98450-11223 (Dr. Mehta Clinic)";
  appendInterceptorLog("📞 INCOMING CALL", familyNumber, "🟢 VERIFIED / SAFE (Score: 0/100)", "Legitimate appointment confirmation. No scam patterns detected.", "safe");
}

// Auto-check clipboard for copied links
async function autoCheckClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.readText) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.startsWith("http://") || text.startsWith("https://") || text.includes(".top/") || text.includes(".xyz/"))) {
      if (typeof analyzeUrlOffline === "function") {
        const res = analyzeUrlOffline(text);
        if (res.risk_score >= 60) {
          showScamAlertPopup({
            type: "links",
            source: "Copied Link from Clipboard",
            sourceIcon: "📋",
            title: "Suspicious Phishing URL Copied",
            snippet: text,
            risk_score: res.risk_score,
            threat_level: res.threat_level || "PHISHING LINK",
            reason: res.summary || "Copied link flagged as malicious credential harvesting trap."
          });
        }
      }
    }
  } catch (e) {
    // Clipboard permission not granted or user denied
  }
}

// ========================================================
// 7. MARKED SCAM MESSAGES & PHISHING VAULT CONTROLLER
// ========================================================
const VAULT_STORAGE_KEY = "scamguard_marked_vault_v1";
let currentVaultFilter = "all";
let activePopupThreat = null;

const DEFAULT_VAULT_SEEDS = [
  {
    id: "scam_1",
    type: "sms",
    source: "SMS from +91 98721-34560 (Spoofed Discom)",
    title: "Tonight 9:30 PM Electricity Cutoff Threat",
    snippet: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer Rahul at 9872134560.",
    risk_score: 90,
    threat_level: "CRITICAL SCAM DETECTED",
    date: new Date(Date.now() - 3600000 * 2).toLocaleDateString() + " " + new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    reason: "Power companies never send personal mobile texts with sudden disconnection deadlines.",
    marked_as_scam: true
  },
  {
    id: "scam_2",
    type: "links",
    source: "Copied Link from WhatsApp Message",
    title: "Spoofed NetBanking KYC Phishing Trap",
    snippet: "http://sbi-netbanking-verify-kyc.top/secure/login",
    risk_score: 100,
    threat_level: "CRITICAL PHISHING LINK",
    date: new Date(Date.now() - 86400000).toLocaleDateString() + " " + new Date(Date.now() - 86400000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    reason: "Deceptive domain '.top' impersonating State Bank of India login portal.",
    marked_as_scam: true
  }
];

function getScamVault() {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(DEFAULT_VAULT_SEEDS));
      return DEFAULT_VAULT_SEEDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_VAULT_SEEDS;
  }
}

function saveScamVault(items) {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
  updateVaultCounters();
  renderScamVault(currentVaultFilter);
}

function updateVaultCounters() {
  const items = getScamVault();
  const total = items.length;
  const smsCount = items.filter(i => i.type === "sms").length;
  const linkCount = items.filter(i => i.type === "links" || i.type === "url").length;
  const callCount = items.filter(i => i.type === "call" || i.type === "calls").length;

  const headerBadge = document.getElementById("vault-badge-header");
  const tabBadge = document.getElementById("vault-badge-tab");
  const statTotal = document.getElementById("stat-total-marked");
  const statSms = document.getElementById("stat-sms-marked");
  const statLinks = document.getElementById("stat-links-marked");
  const statCalls = document.getElementById("stat-calls-marked");

  if (headerBadge) headerBadge.textContent = total;
  if (tabBadge) tabBadge.textContent = total;
  if (statTotal) statTotal.textContent = total;
  if (statSms) statSms.textContent = smsCount;
  if (statLinks) statLinks.textContent = linkCount;
  if (statCalls) statCalls.textContent = callCount;
}

function renderScamVault(filter = "all") {
  currentVaultFilter = filter;
  const container = document.getElementById("vault-items-container");
  if (!container) return;

  const items = getScamVault();
  const filtered = items.filter(item => {
    if (filter === "all") return true;
    if (filter === "sms") return item.type === "sms";
    if (filter === "links") return item.type === "links" || item.type === "url";
    if (filter === "calls") return item.type === "call" || item.type === "calls";
    return true;
  });

  ["all", "sms", "links", "calls"].forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (btn) {
      if (f === filter) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border-color);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛡️</div>
        <h4 style="color: var(--text-main); margin-bottom: 0.35rem;">No Scams in this Category</h4>
        <p style="font-size: 0.82rem;">When ScamGuard intercepts a fake message, link, or call, it will automatically alert you with a pop-up and mark it here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "vault-card";
    const typeIcon = item.type === "sms" ? "💬" : (item.type === "links" || item.type === "url" ? "🌐" : "📞");

    card.innerHTML = `
      <div class="vault-card-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="vault-tag-marked">🚩 MARKED AS SCAM</span>
          <span class="threat-badge severity-danger-bg" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; margin-top: 0;">
            ${item.threat_level || 'CRITICAL'} (${item.risk_score || 90}/100)
          </span>
        </div>
        <span class="vault-date">🕒 ${item.date}</span>
      </div>

      <div class="vault-source">${typeIcon} ${item.source}</div>
      <div style="font-weight: 700; color: #ff6b6b; font-size: 0.92rem; margin-bottom: 0.35rem;">${item.title}</div>
      
      <div class="vault-body">
        "${escapeHtml(item.snippet)}"
      </div>

      <div style="font-size: 0.78rem; color: #fef08a; margin-bottom: 0.85rem; line-height: 1.35;">
        💡 <strong>Reason Marked:</strong> ${escapeHtml(item.reason || 'Manipulative social engineering signature detected.')}
      </div>

      <div class="vault-actions">
        <button class="btn btn-primary" onclick="draftComplaintFromVault('${item.id}')" style="background: linear-gradient(135deg, #00f0ff 0%, #0088ff 100%); color: #051329;">
          🚨 File 1930 Cyber Complaint
        </button>
        <button class="btn btn-secondary" onclick="copyVaultItem('${item.id}')">
          📋 Copy Evidence
        </button>
        <button class="btn btn-secondary" onclick="removeVaultItem('${item.id}')" style="color: #ff6b6b; border-color: rgba(239, 68, 68, 0.4);">
          🗑️ Unmark & Remove
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterVault(category) {
  renderScamVault(category);
}

function removeVaultItem(id) {
  const items = getScamVault().filter(i => i.id !== id);
  saveScamVault(items);
}

function clearScamVault() {
  if (confirm("Are you sure you want to clear all marked scams from your vault?")) {
    saveScamVault([]);
  }
}

function copyVaultItem(id) {
  const item = getScamVault().find(i => i.id === id);
  if (!item) return;
  const text = `[SCAMGUARD INCIDENT EVIDENCE]\nType: ${item.title}\nSource: ${item.source}\nDate: ${item.date}\nRisk: ${item.risk_score}/100\nContent:\n${item.snippet}\nReason: ${item.reason}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("✅ Scam evidence copied to clipboard! Ready to paste into 1930 complaint.");
  });
}

function draftComplaintFromVault(id) {
  const item = getScamVault().find(i => i.id === id);
  if (!item) return;
  lastAnalyzedThreat = {
    type: item.type === "sms" ? "msg" : (item.type === "call" ? "call" : "url"),
    data: {
      risk_score: item.risk_score,
      threat_level: item.threat_level,
      flagged_elements: [item.title, item.reason],
      recommended_action: "Disconnect, do not share OTP, and report to 1930."
    }
  };
  if (typeof generateComplaintOffline === "function") {
    const rep = generateComplaintOffline(lastAnalyzedThreat.type, item.snippet, lastAnalyzedThreat.data);
    document.getElementById("complaint-text").textContent = rep.formatted_complaint;
    switchTab("tab-report");
  }
}

function exportMarkedScams() {
  const items = getScamVault();
  if (items.length === 0) {
    alert("No marked scams in vault to export.");
    return;
  }
  let exportText = `====================================================\nSCAMGUARD 360 SENTINEL - MARKED FRAUD INCIDENT LOG\nExported on: ${new Date().toLocaleString()}\nTotal Incidents Marked: ${items.length}\n====================================================\n\n`;
  items.forEach((item, idx) => {
    exportText += `INCIDENT #${idx + 1}:\nType: ${item.title}\nSource: ${item.source}\nDate: ${item.date}\nRisk Score: ${item.risk_score}/100 (${item.threat_level})\nEvidence Text:\n"${item.snippet}"\nReason: ${item.reason}\n----------------------------------------------------\n\n`;
  });
  navigator.clipboard.writeText(exportText).then(() => {
    alert("✅ All marked scams exported to clipboard as official incident evidence report!");
  });
}

function markCurrentScanAsScam(scanType) {
  let snippet = "";
  let source = "";
  let title = "Marked Fraud Threat";
  let reason = "Flagged by user as fraudulent social engineering attempt.";
  let riskScore = 90;

  if (scanType === "msg") {
    snippet = document.getElementById("message-input").value;
    source = "SMS / WhatsApp Message";
    title = "Marked Scam Message";
  } else if (scanType === "url") {
    snippet = document.getElementById("url-input").value;
    source = "Marked Phishing URL";
    title = "Phishing Website";
  } else {
    snippet = document.getElementById("call-transcript-input").value;
    source = "Inbound Phone Call";
    title = "Impersonation Call";
  }

  if (!snippet.trim()) {
    alert("Please enter or scan content before marking as scam.");
    return;
  }

  if (lastAnalyzedThreat && lastAnalyzedThreat.data) {
    riskScore = lastAnalyzedThreat.data.risk_score || 90;
    if (lastAnalyzedThreat.data.summary) reason = lastAnalyzedThreat.data.summary;
  }

  const newItem = {
    id: "scam_" + Date.now(),
    type: scanType === "msg" ? "sms" : (scanType === "url" ? "links" : "calls"),
    source: source,
    title: title,
    snippet: snippet,
    risk_score: Math.max(riskScore, 75),
    threat_level: "MARKED SCAM",
    date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    reason: reason,
    marked_as_scam: true
  };

  const items = getScamVault();
  items.unshift(newItem);
  saveScamVault(items);

  const btn = document.getElementById(`btn-mark-${scanType}-scam`);
  if (btn) {
    btn.textContent = "✅ Marked as Scam!";
    setTimeout(() => {
      btn.textContent = scanType === "msg" ? "🚩 Mark as Scam & Save" : "🚩 Mark as Phishing Link & Save";
    }, 2500);
  }

  alert("🚩 Successfully marked as SCAM and saved to your Marked Scams Vault!");
}

// ========================================================
// 8. URGENT HEADS-UP SCAM POP-UP MODAL CONTROLLER
// ========================================================
function showScamAlertPopup(threatPayload) {
  activePopupThreat = threatPayload;

  const modal = document.getElementById("scam-popup-modal");
  const sourcePill = document.getElementById("popup-source-pill");
  const badge = document.getElementById("popup-threat-badge");
  const messageBody = document.getElementById("popup-message-body");
  const whyBox = document.getElementById("popup-why-box");

  if (!modal) return;

  if (sourcePill) sourcePill.innerHTML = `<span>${threatPayload.sourceIcon || '🚨'} ${escapeHtml(threatPayload.source || 'Intercepted Inbound Alert')}</span>`;
  if (badge) badge.textContent = `🔴 DANGEROUS SCAM (${threatPayload.risk_score || 90}/100)`;
  if (messageBody) messageBody.textContent = `"${threatPayload.snippet || ''}"`;
  if (whyBox) whyBox.innerHTML = `💡 <strong>Why this is fake:</strong> ${escapeHtml(threatPayload.reason || 'Manipulative extortion or credential theft signature detected.')}`;

  // Automatically save to Marked Scams Vault
  const newItem = {
    id: "scam_" + Date.now(),
    type: threatPayload.type || "sms",
    source: threatPayload.source || "Intercepted SMS",
    title: threatPayload.title || "Intercepted Scam Threat",
    snippet: threatPayload.snippet || "",
    risk_score: threatPayload.risk_score || 90,
    threat_level: "CRITICAL SCAM DETECTED",
    date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    reason: threatPayload.reason || "Suspicious social engineering tactic.",
    marked_as_scam: true
  };

  const currentItems = getScamVault();
  if (!currentItems.some(i => i.snippet === newItem.snippet)) {
    currentItems.unshift(newItem);
    saveScamVault(currentItems);
  }

  // Trigger Audio Alert & Phone Haptics
  playThreatSound(threatPayload.risk_score || 90);
  triggerAndroidHaptics(90);

  // Trigger Web Notifications if permitted
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("🚨 SCAMGUARD ALERT: SCAM DETECTED!", {
        body: threatPayload.title + ": " + (threatPayload.snippet ? threatPayload.snippet.substring(0, 80) : ""),
        icon: "/icon.svg"
      });
    } catch (e) {}
  }

  // Display Pop-up Modal with Animation
  modal.classList.add("active");
}

function closeScamPopup() {
  const modal = document.getElementById("scam-popup-modal");
  if (modal) modal.classList.remove("active");
}

function confirmScamFromPopup() {
  closeScamPopup();
  switchTab("tab-vault");
}

function popupDraftComplaint() {
  closeScamPopup();
  if (activePopupThreat) {
    lastAnalyzedThreat = {
      type: activePopupThreat.type === "sms" ? "msg" : (activePopupThreat.type === "call" ? "call" : "url"),
      data: {
        risk_score: activePopupThreat.risk_score || 90,
        threat_level: "CRITICAL SCAM",
        flagged_elements: [activePopupThreat.title, activePopupThreat.reason],
        recommended_action: "Disconnect, do not share OTP, and report to 1930."
      }
    };
    if (typeof generateComplaintOffline === "function") {
      const rep = generateComplaintOffline(lastAnalyzedThreat.type, activePopupThreat.snippet, lastAnalyzedThreat.data);
      document.getElementById("complaint-text").textContent = rep.formatted_complaint;
      switchTab("tab-report");
    }
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ========================================================
// SHARE SCAMGUARD WITH FAMILY & FRIENDS (WHATSAPP & QR)
// ========================================================
function getPublicShareUrl() {
  const origin = window.location.origin;
  if (!origin || origin === "null" || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("file:")) {
    return "https://well-fan-dgo55.ship.place";
  }
  return origin;
}

function openShareModal() {
  const modal = document.getElementById("share-modal");
  const urlBox = document.getElementById("mobile-url-text");
  const shareBtn = document.getElementById("btn-whatsapp-share");
  const qrImg = document.getElementById("qr-image");
  const currentUrl = getPublicShareUrl();

  if (modal) modal.classList.add("active");
  if (urlBox) urlBox.textContent = currentUrl;
  if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;

  const msg = encodeURIComponent(`🛡️ Protect yourself & family from fake CBI scam calls, electricity cutoff threats, and bank fraud! Use ScamGuard 360 on your phone: ${currentUrl} - Stay safe!`);
  if (shareBtn) shareBtn.href = `https://api.whatsapp.com/send?text=${msg}`;
}

function closeShareModal() {
  const modal = document.getElementById("share-modal");
  if (modal) modal.classList.remove("active");
}

function shareViaWhatsAppDirect() {
  const currentUrl = getPublicShareUrl();
  const msg = encodeURIComponent(`🛡️ Protect yourself & family from fake CBI scam calls, electricity cutoff threats, and bank fraud! Use ScamGuard 360 on your phone: ${currentUrl} - Stay safe!`);
  window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
}

function copyShareLink() {
  const currentUrl = getPublicShareUrl();
  navigator.clipboard.writeText(currentUrl).then(() => {
    alert("✅ App link copied to clipboard!\n\nYou can now paste it into WhatsApp, Telegram, or SMS to send it to anyone.");
  }).catch(() => {
    prompt("Copy this link to share with family:", currentUrl);
  });
}



