/**
 * ScamGuard 360 - Complete Standalone Client-Side AI Engine
 * 100% Offline & Universal. Runs inside ANY mobile device, APK, or browser
 * without requiring any computer or server!
 */

const LOCAL_SCAM_CATEGORIES = {
  digital_arrest_police: {
    name: "Digital Arrest & Police Impersonation",
    description: "Scammer poses as Police, CBI, ED, Customs, or Court claiming illegal drugs or arrest warrants to extort money.",
    keywords: [
      "digital arrest", "police", "cbi", "narcotics", "customs",
      "illegal passport", "drugs in parcel", "arrest warrant", "arrest",
      "money laundering", "supreme court", "stay on video call", "do not disconnect",
      "enforcement directorate", "fedex parcel", "taiwan parcel", "contraband"
    ],
    weight: 40
  },
  bank_kyc_freeze: {
    name: "Bank Account Freeze & KYC Threat",
    description: "Scammer threatens account block or debit card expiry to steal sensitive banking credentials.",
    keywords: [
      "account suspended", "kyc update", "kyc", "pan card blocked", "debit card expired",
      "bank manager", "verify your details", "sim card deactivated",
      "unauthorized transaction", "card blocked", "rbi verification"
    ],
    weight: 35
  },
  credential_harvesting: {
    name: "OTP & Password Stealing",
    description: "Scammer attempts to extract confidential OTP, PIN, password, or install screen-sharing spy apps.",
    keywords: [
      "otp", "one time password", "cvv", "atm pin", "pin", "password",
      "install anydesk", "anydesk", "teamviewer", "quicksupport",
      "screen sharing", "confirmation code", "6 digit"
    ],
    weight: 40
  },
  lottery_crypto_investment: {
    name: "Fake Lottery & Part-Time Job Scam",
    description: "Fake promises of winning KBC lucky draws or earning thousands daily by liking YouTube videos.",
    keywords: [
      "congratulations you won", "lottery winner", "lottery", "kbc lucky draw", "kbc",
      "25 lakh", "guaranteed double return", "crypto investment", "daily income",
      "like youtube videos", "processing fee"
    ],
    weight: 30
  },
  urgency_coercion: {
    name: "Panic & False Urgency Tactics",
    description: "Creates false panic with urgent deadlines (tonight cutoff) to force you into rash decisions.",
    keywords: [
      "immediately", "right now", "do not tell anyone", "strictly confidential",
      "within 10 minutes", "electricity disconnected", "power disconnect",
      "call will disconnect", "last warning", "urgent"
    ],
    weight: 25
  }
};

const LOCAL_HIGH_RISK_TLDS = [
  ".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq",
  ".work", ".click", ".live", ".loan", ".cam", ".zip",
  ".mov", ".vip", ".cc", ".icu", ".monster", ".bar"
];

const LOCAL_POPULAR_BRANDS = [
  "paypal", "google", "apple", "amazon", "netflix", "microsoft",
  "facebook", "instagram", "whatsapp", "telegram", "sbi", "hdfc",
  "icici", "axis", "kotak", "rbi", "paytm", "phonepe", "gpay",
  "binance", "coinbase", "chase", "bankofamerica", "wellsfargo"
];

// Offline Demo Presets
const LOCAL_PRESETS = {
  calls: [
    {
      title: "🚨 Fake CBI / Digital Arrest Threat",
      text: "Hello, I am Officer Vikram calling from CBI Narcotics Bureau Mumbai. A FedEx parcel sent to Taiwan in your name contains 5 expired passports and 140 grams of contraband MDMA. The Supreme Court has issued an immediate arrest warrant. You are placed under digital arrest right now. Do not disconnect this call or tell anyone. You must verify your bank account funds immediately to clear money laundering charges."
    },
    {
      title: "🚨 Fake Bank Manager KYC Expiry",
      text: "Dear customer, I am calling from SBI Main Branch. Your debit card and net banking are scheduled to be blocked within 2 hours due to pending KYC update. Please confirm your date of birth and share the 6-digit verification OTP code sent to your phone right now to stop permanent deactivation."
    },
    {
      title: "✅ Safe Call (Doctor Appointment)",
      text: "Hello Mr. Sharma, this is City Care Clinic calling to confirm your dental checkup scheduled for tomorrow at 4:30 PM with Dr. Mehta. Please arrive 10 minutes early. No payment or documents needed right now. Have a nice day!"
    }
  ],
  urls: [
    {
      title: "🚨 Fake SBI Banking Portal",
      url: "http://sbi-netbanking-verify-kyc.top/secure/login"
    },
    {
      title: "🚨 Fake PayPal IP Address",
      url: "http://185.193.125.44/paypal-update-account/auth"
    },
    {
      title: "🚨 Fake Free Amazon Gift Link",
      url: "http://amazon-prime-free-anniversary-rewards.xyz/claim"
    },
    {
      title: "✅ Official Genuine Bank Website",
      url: "https://www.onlinesbi.sbi"
    }
  ],
  messages: [
    {
      title: "🚨 Tonight 9:30 PM Electricity Cutoff",
      text: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer Rahul at 9872134560. Thank you."
    },
    {
      title: "🚨 Telegram YouTube Like Job",
      text: "Hi! Part time job offer: Earn Rs 3000 to Rs 8000 daily from home. Just like YouTube videos and write reviews. Zero investment required. Contact WhatsApp HR +919834211029 or join Telegram @quick_income_task"
    },
    {
      title: "🚨 KBC 25 Lakh Lottery Winner",
      text: "Congratulations! Your SIM number won 25 Lakh Rupees in KBC Lucky Draw 2026. To claim your cash prize, WhatsApp your name and bank passbook to KBC Manager Rana Pratap Singh on 9811234567 immediately."
    },
    {
      title: "✅ Normal Delivery Update",
      text: "Your package containing order #402-9812 has been dispatched via BlueDart and is expected to arrive by Wednesday. Track your order on the official mobile app. OTP is not required for tracking."
    }
  ]
};

// Offline Case Studies
const LOCAL_CASE_STUDIES = [
  {
    title: "Digital Arrest Video Call Scam",
    modus_operandi: "Scammers pose as CBI/Police in uniform over Skype or WhatsApp video calls, falsely claiming a courier containing illegal drugs was caught in your name. They order you to stay on video in a closed room and transfer your savings into 'RBI verification accounts'.",
    golden_rule: "Real Police, CBI, or Courts NEVER conduct digital arrests or demand money transfers over video calls.",
    victim_action: "Hang up immediately. Block the caller and report to cyber helpline 1930."
  },
  {
    title: "Tonight 9:30 PM Power Cutoff Scam",
    modus_operandi: "You receive an SMS saying power will be disconnected tonight due to unpaid bills, giving an unverified personal phone number to call. When you call, they trick you into downloading remote screen-sharing apps or paying via fake portals.",
    golden_rule: "Power companies send bills via official accounts, never from personal 10-digit mobile numbers with cutoff threats.",
    victim_action: "Check bill status only on your official state electricity board app or website."
  },
  {
    title: "YouTube Video Like / Telegram Task Scam",
    modus_operandi: "Offers ₹50-₹150 for liking YouTube videos. After tiny payments to build trust, victims are invited to 'prepaid investment tasks' where lakhs of rupees are stolen.",
    golden_rule: "Legitimate businesses never pay you for liking videos, nor do they require money deposits to withdraw earnings.",
    victim_action: "Do not join Telegram job channels. Block the recruiter immediately."
  },
  {
    title: "Fake Banking APK / Rewards Update",
    modus_operandi: "Messages ask you to install an APK file (e.g. 'SBI_Rewards.apk' or 'TrafficChallan.apk'). Once installed, this virus reads OTPs and empties bank accounts.",
    golden_rule: "NEVER install .apk files received over WhatsApp, SMS, or websites. Only install apps from Google Play Store.",
    victim_action: "Turn on Google Play Protect and uninstall any unfamiliar apps."
  }
];

// Offline Quiz Questions
const LOCAL_QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "A caller claiming to be a CBI Officer says a parcel in your name contains illegal drugs and orders you to stay on a video call in a closed room. What should you do?",
    options: [
      "Comply and transfer money to their 'verification account' immediately.",
      "Stay on video to prove you are innocent.",
      "Hang up immediately, do not panic, and call 1930 or visit your local police station.",
      "Send them your Aadhaar and bank details."
    ],
    correct_index: 2,
    explanation: "CBI and Police NEVER conduct arrests over video calls or ask for money. This is a 100% scam."
  },
  {
    id: 2,
    question: "You get an SMS: 'Electricity will be disconnected tonight at 9:30 PM. Call officer at 9876543210.' What is the truth?",
    options: [
      "Call the number immediately and pay ₹10 as instructed.",
      "This is a common scam; electricity boards never send cutoff threats from personal mobile numbers.",
      "Share your card details over phone to prevent disconnection.",
      "Forward the SMS to all your contacts."
    ],
    correct_index: 1,
    explanation: "Electricity boards never send personal mobile texts with sudden disconnection deadlines."
  },
  {
    id: 3,
    question: "An SMS says: 'Your bank account will be blocked. Click http://sbi-card-update.top to update PAN.' What should you do?",
    options: [
      "Click the link and enter your PIN and OTP.",
      "Never click suspicious '.top' links; verify directly in your official banking app or branch.",
      "Reply with your PAN card photo.",
      "Forward the link to family."
    ],
    correct_index: 1,
    explanation: "Banks never ask for confidential updates through random web links with unusual domains like '.top'."
  },
  {
    id: 4,
    question: "A stranger on Telegram offers you ₹5,000 per day just for liking YouTube videos. What is this?",
    options: [
      "A legitimate remote digital marketing job.",
      "A classic 'Task Scam' designed to lure you into paying large 'investment deposits' that are stolen.",
      "An easy way to double your monthly savings.",
      "A government-approved online gig."
    ],
    correct_index: 1,
    explanation: "No legitimate company pays you to like videos. Small initial payouts are bait to steal larger sums."
  }
];

// Offline Call Analyzer
function analyzeCallOffline(transcript) {
  if (!transcript || !transcript.trim()) {
    return {
      risk_score: 0,
      threat_level: "SAFE",
      is_scam: false,
      summary: "No speech or text provided.",
      flagged_categories: [],
      flagged_keywords: [],
      psychological_tactics: [],
      recommended_action: "Speak or enter call text to scan."
    };
  }

  const text = transcript.toLowerCase();
  let score = 0;
  const detected_categories = [];
  const all_flagged_keywords = [];
  const tactics = [];

  for (const [cat_id, cat_info] of Object.entries(LOCAL_SCAM_CATEGORIES)) {
    const found = cat_info.keywords.filter(kw => text.includes(kw));
    if (found.length > 0) {
      detected_categories.push({
        id: cat_id,
        name: cat_info.name,
        description: cat_info.description,
        matched_keywords: found
      });
      score += Math.min(found.length * 15, cat_info.weight);
      all_flagged_keywords.push(...found);
    }
  }

  if (["arrest", "police", "jail", "court", "cbi"].some(t => text.includes(t))) tactics.push("Police / Authority Impersonation");
  if (["immediately", "right now", "10 minutes", "urgent"].some(t => text.includes(t))) tactics.push("Manufactured Urgency & Panic");
  if (["do not tell anyone", "strictly confidential", "keep quiet"].some(t => text.includes(t))) tactics.push("Social Isolation & Secrecy Demand");
  if (["otp", "pin", "cvv", "password"].some(t => text.includes(t))) tactics.push("Direct OTP / Password Stealing");
  if (["anydesk", "teamviewer", "quicksupport"].some(t => text.includes(t))) tactics.push("Remote Screen Spy App");

  if (["anydesk", "teamviewer", "otp", "6 digit"].some(t => text.includes(t))) score += 25;

  const risk_score = Math.min(score, 100);
  let threat_level = "SAFE / LOW RISK";
  let is_scam = false;
  let action = "Call appears safe. Always remember: Never share your OTP with anyone.";

  if (risk_score >= 65) {
    threat_level = "DANGEROUS SCAM!";
    is_scam = true;
    action = "HANG UP IMMEDIATELY! Do NOT share OTP, passwords, or money. Real police never make digital arrests.";
  } else if (risk_score >= 35) {
    threat_level = "SUSPICIOUS CALL";
    is_scam = true;
    action = "BE VERY CAREFUL. Ask caller for official badge/ID or call the official organization number yourself.";
  }

  return {
    risk_score,
    threat_level,
    is_scam,
    flagged_categories,
    flagged_keywords: Array.from(new Set(all_flagged_keywords)),
    psychological_tactics: tactics,
    recommended_action: action,
    summary: risk_score >= 65 ? `High danger scam call (${risk_score}/100) using fear and urgency tactics.` : `Call risk evaluated at ${risk_score}/100.`
  };
}

// Offline URL Analyzer
function analyzeUrlOffline(raw_url) {
  if (!raw_url || !raw_url.trim()) return { risk_score: 0, threat_level: "UNKNOWN", indicators: [] };
  let url = raw_url.trim();
  if (!/^https?:\/\//i.test(url)) url = "http://" + url;

  let hostname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
  } catch (e) {
    return { risk_score: 85, threat_level: "MALFORMED LINK", indicators: [{ title: "Malformed link syntax", details: "Unsafe structure" }] };
  }

  let score = 0;
  const indicators = [];

  // IP host check
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    indicators.push({ title: "Direct IP Address Used", severity: "CRITICAL", details: `Hosted on raw IP '${hostname}'. Legitimate websites use real domain names.` });
    score += 40;
  }

  // Punycode check
  if (hostname.includes("xn--")) {
    indicators.push({ title: "Lookalike Fake Letters (Punycode)", severity: "CRITICAL", details: "Uses lookalike unicode characters to visually imitate trusted companies." });
    score += 35;
  }

  // High-risk TLD
  const matchedTld = LOCAL_HIGH_RISK_TLDS.find(t => hostname.endsWith(t));
  if (matchedTld) {
    indicators.push({ title: `High-Risk Scam Domain Ending (${matchedTld})`, severity: "HIGH", details: "Domain uses a cheap, disposable extension frequently abused by fraudsters." });
    score += 25;
  }

  // Brand spoofing
  const lowerUrl = url.toLowerCase();
  const matchedBrands = LOCAL_POPULAR_BRANDS.filter(b => lowerUrl.includes(b));
  const isGenuine = matchedBrands.some(b => hostname === `${b}.com` || hostname.endsWith(`.${b}.com`) || hostname.endsWith(`.${b}.sbi`));
  if (matchedBrands.length > 0 && !isGenuine) {
    indicators.push({ title: `Fake Brand Impersonation (${matchedBrands.join(", ").toUpperCase()})`, severity: "CRITICAL", details: "This website claims to be from a well-known brand, but is hosted on an unverified fake site." });
    score += 40;
  }

  // Hyphenated host
  if ((hostname.match(/-/g) || []).length >= 2) {
    indicators.push({ title: "Suspicious Hyphenated Name", severity: "MEDIUM", details: "Scammers add hyphens like 'sbi-login-verify' to look official." });
    score += 15;
  }

  const risk_score = Math.min(score, 100);
  let threat_level = risk_score >= 60 ? "FAKE / PHISHING WEBSITE!" : (risk_score >= 30 ? "SUSPICIOUS LINK" : "PROBABLY SAFE");
  let action = risk_score >= 60 ? "DO NOT OPEN THIS LINK! It is designed to steal your bank password or credit card." : "Open with caution or verify via official app.";

  return {
    risk_score,
    threat_level,
    hostname,
    indicators,
    is_phishing: risk_score >= 60,
    recommended_action: action,
    summary: `Website '${hostname}': Threat score ${risk_score}/100.`
  };
}

// Offline Message Analyzer
function analyzeMessageOffline(msg) {
  if (!msg || !msg.trim()) return { risk_score: 0, threat_level: "UNKNOWN", flagged_elements: [] };
  const text = msg.toLowerCase();
  let score = 0;
  const flagged = [];

  if (/electricity|bijli|power supply/i.test(text) && /disconnect|cut off|tonight/i.test(text)) {
    flagged.push("Electricity Disconnection Fake Threat");
    score += 35;
  }
  if (/earn.*(?:daily|per day)|part time.*job|like.*youtube.*video|telegram/i.test(text)) {
    flagged.push("YouTube Video Like / Telegram Task Scam");
    score += 30;
  }
  if (/won.*(?:lottery|kbc|cash prize|lakh)|congratulations.*winner/i.test(text)) {
    flagged.push("Fake KBC / Lottery Prize Scam");
    score += 35;
  }
  if (/account.*(?:blocked|suspended|kyc|pan)|update.*pan/i.test(text)) {
    flagged.push("Bank Account / KYC Panic Message");
    score += 35;
  }
  if (/parcel|package|delivery.*(?:failed|pending|customs)/i.test(text)) {
    flagged.push("Fake Courier Delivery Fee Link");
    score += 25;
  }

  // Extracted links
  const urlMatches = msg.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|site|cc|net|org|com)\/[^\s]*)/gi) || [];
  urlMatches.forEach(u => {
    const urlRes = analyzeUrlOffline(u);
    if (urlRes.risk_score >= 50) {
      flagged.push(`Dangerous Phishing Link in Text: ${urlRes.hostname}`);
      score += 30;
    }
  });

  if (["immediately", "tonight", "urgent", "24 hours"].some(t => text.includes(t))) {
    flagged.push("False Urgency / Rush Tactic");
    score += 15;
  }

  const risk_score = Math.min(score, 100);
  let threat_level = risk_score >= 60 ? "DANGEROUS SCAM MESSAGE!" : (risk_score >= 30 ? "SUSPICIOUS MESSAGE" : "NORMAL / SAFE MESSAGE");
  let action = risk_score >= 60 ? "DO NOT CALL THE NUMBER OR CLICK LINKS! Delete and block sender immediately." : "Seems normal, but never share private passwords.";

  return {
    risk_score,
    threat_level,
    flagged_elements: flagged,
    is_scam: risk_score >= 30,
    recommended_action: action,
    summary: `Message threat score ${risk_score}/100 with ${flagged.length} red flags.`
  };
}

// Offline Complaint Drafter
function generateComplaintOffline(incident_type, raw_input, threat_data) {
  const now = new Date().toLocaleString();
  const report_text = `====================================================
CYBER FRAUD INCIDENT REPORT
Generated by ScamGuard 360
Date & Time: ${now}
====================================================

INCIDENT TYPE: ${incident_type.toUpperCase()}
ASSESSED THREAT: ${threat_data.threat_level || 'SUSPICIOUS'} (${threat_data.risk_score || 0}/100)

EVIDENCE DETAILS:
----------------------------------------------------
${raw_input}
----------------------------------------------------

KEY RED FLAGS IDENTIFIED:
${(threat_data.flagged_elements || []).map(e => "- " + e).join("\n")}
${(threat_data.indicators || []).map(i => "- " + i.title + ": " + (i.details || "")).join("\n")}
${(threat_data.psychological_tactics || []).map(t => "- Psychological tactic: " + t).join("\n")}

RECOMMENDED ACTION:
1. ${threat_data.recommended_action || 'Block sender and do not disclose credentials.'}
2. Call Citizen Financial Cyber Fraud Helpline '1930' immediately.
3. Lodge formal complaint at: https://cybercrime.gov.in
====================================================`;

  return {
    timestamp: now,
    formatted_complaint: report_text
  };
}
