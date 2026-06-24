/**
 * Vishwa Mamidi Golf Profile — Backend Server
 * Node.js + Express
 *
 * Handles:
 *   POST /api/send-otp    — generate OTP, send via SendGrid
 *   POST /api/verify-otp  — validate submitted OTP
 *
 * SendGrid integration: replace the SENDGRID_API_KEY placeholder
 * in your .env file to activate real email delivery.
 */

require('dotenv').config();

const express    = require('express');
const crypto     = require('crypto');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'vmachavarapu@gmail.com';
const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutes
const FROM_EMAIL     = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
const FROM_NAME      = 'Vishwa Mamidi Golf Profile';

// ── In-memory OTP store (swap for Redis in production) ────────────────────
// Structure: { email: { code, expiresAt, attempts } }
const otpStore = new Map();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting: max 5 OTP requests per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 5,
  message  : { error: 'Too many requests. Please wait 15 minutes and try again.' },
});

// ── Helpers ────────────────────────────────────────────────────────────────
function generateOTP() {
  // Cryptographically secure 6-digit code
  return String(crypto.randomInt(100000, 999999));
}

async function sendOTPEmail(toEmail, code) {
  if (!process.env.SENDGRID_API_KEY) {
    // DEV-ONLY fallback: log the code to the console
    console.log(`\n[DEV] OTP for ${toEmail}: ${code}\n`);
    return;
  }

  const msg = {
    to      : toEmail,
    from    : { email: FROM_EMAIL, name: FROM_NAME },
    subject : 'Your Vishwa Golf Profile login code',
    text    : `Your one-time login code is: ${code}\n\nThis code expires in 10 minutes.`,
    html    : `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px">
        <h2 style="font-size:22px;margin-bottom:8px">Your login code</h2>
        <p style="color:#555;margin-bottom:24px">
          Use this code to access the Vishwa Mamidi Golf Profile admin panel.
        </p>
        <div style="background:#0A1628;border-left:3px solid #C9A84C;
                    padding:20px 28px;border-radius:2px;text-align:center;
                    font-size:36px;font-weight:700;letter-spacing:0.2em;color:#E8C96A">
          ${code}
        </div>
        <p style="color:#999;font-size:12px;margin-top:20px">
          Expires in 10 minutes. If you didn't request this, ignore this email.
        </p>
      </div>`,
  };
  await sgMail.send(msg);
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/send-otp
 * Body: { email: string }
 */
app.post('/api/send-otp', otpLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Only allow the registered admin email
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    // Return success anyway (don't leak which emails are valid)
    return res.json({ message: 'If that email is registered, a code has been sent.' });
  }

  const code      = generateOTP();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  otpStore.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });

  try {
    await sendOTPEmail(email, code);
    return res.json({ message: 'Code sent successfully.' });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

/**
 * POST /api/verify-otp
 * Body: { email: string, code: string }
 */
app.post('/api/verify-otp', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const key    = email.toLowerCase();
  const record = otpStore.get(key);

  if (!record) {
    return res.status(401).json({ error: 'No code found. Please request a new one.' });
  }

  // Expired?
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return res.status(401).json({ error: 'Code has expired. Please request a new one.' });
  }

  // Too many attempts (max 5)
  if (record.attempts >= 5) {
    otpStore.delete(key);
    return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
  }

  // Wrong code?
  if (code !== record.code) {
    record.attempts++;
    return res.status(401).json({ error: `Incorrect code. ${5 - record.attempts} attempts remaining.` });
  }

  // ✓ Correct — invalidate OTP immediately
  otpStore.delete(key);
  return res.json({ success: true, message: 'Verified.' });
});

// ── Catch-all: serve the SPA ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Golf profile server running on http://localhost:${PORT}`);
  console.log(`    Admin email : ${ADMIN_EMAIL}`);
  console.log(`    SendGrid    : ${process.env.SENDGRID_API_KEY ? '✓ configured' : '⚠ not configured (OTP logged to console)'}\n`);
});
