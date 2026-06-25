/* ═══════════════════════════════════════════════════════════
   Vishwa Mamidi — Golf Profile · Frontend JS
   OTP login flow, admin edit mode, file uploads
   ═══════════════════════════════════════════════════════════ */

const ADMIN_EMAIL = 'vmachavarapu@gmail.com'; // authorised admin
let resendTimer = null;

/* ─── Toast ───────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2500);
}

/* ─── Step 1: Send OTP ────────────────────────────────────── */
async function sendOTP() {
  const email = document.getElementById('emailInput').value.trim();
  const err   = document.getElementById('emailErr');

  if (!email || !email.includes('@')) {
    err.textContent = 'Please enter a valid email address.';
    return;
  }

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled   = true;
  btn.textContent = 'Sending…';
  err.textContent = '';

  try {
    const res  = await fetch('/api/send-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.error || 'Failed to send code. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Send one-time code';
      return;
    }

    // Move to step 2
    document.getElementById('otpSentTo').textContent =
      `A 6-digit code was sent to ${email}`;
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.querySelectorAll('.otp-box')[0].focus();
    startCountdown();

  } catch (e) {
    err.textContent = 'Network error — please check your connection.';
    btn.disabled    = false;
    btn.textContent = 'Send one-time code';
  }
}

/* ─── Step 2: Verify OTP ──────────────────────────────────── */
async function verifyOTP() {
  const email  = document.getElementById('emailInput').value.trim();
  const boxes  = document.querySelectorAll('.otp-box');
  const code   = Array.from(boxes).map(b => b.value).join('');
  const err    = document.getElementById('otpErr');

  if (code.length < 6) {
    err.textContent = 'Please enter all 6 digits.';
    return;
  }

  const btn = document.getElementById('verifyBtn');
  btn.disabled    = true;
  btn.textContent = 'Verifying…';
  err.textContent = '';

  try {
    const res  = await fetch('/api/verify-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, code }),
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.error || 'Incorrect code. Please try again.';
      boxes.forEach(b => { b.style.borderColor = '#E74C3C'; });
      btn.disabled    = false;
      btn.textContent = 'Verify & unlock';
      return;
    }

    // ✓ Verified — unlock admin mode
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('loginTrigger').style.display = 'none';
    enableAdminMode();

  } catch (e) {
    err.textContent = 'Network error — please check your connection.';
    btn.disabled    = false;
    btn.textContent = 'Verify & unlock';
  }
}

/* ─── Resend OTP ──────────────────────────────────────────── */
async function resendOTP() {
  const email = document.getElementById('emailInput').value.trim();

  document.querySelectorAll('.otp-box').forEach(b => {
    b.value = '';
    b.classList.remove('filled');
    b.style.borderColor = '';
  });
  document.getElementById('otpErr').textContent = '';

  // Re-use sendOTP logic via fetch directly
  try {
    await fetch('/api/send-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    showToast('New code sent!');
  } catch(e) {
    showToast('Could not resend — check connection.');
  }

  document.getElementById('resendBtn').innerHTML =
    'Resend in <span id="countdown">30</span>s';
  startCountdown();
  document.querySelectorAll('.otp-box')[0].focus();
}

/* ─── Countdown timer ─────────────────────────────────────── */
function startCountdown() {
  let secs = 30;
  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  clearInterval(resendTimer);

  resendTimer = setInterval(() => {
    secs--;
    const el = document.getElementById('countdown');
    if (el) el.textContent = secs;
    if (secs <= 0) {
      clearInterval(resendTimer);
      btn.disabled   = false;
      btn.textContent = 'Resend code';
    }
  }, 1000);
}

/* ─── Navigation ──────────────────────────────────────────── */
function goBack() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  document.getElementById('otpErr').textContent  = '';
  clearInterval(resendTimer);

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled    = false;
  btn.textContent = 'Send one-time code';
}

function showOverlay() {
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('loginTrigger').style.display = 'none';
}

/* ─── Admin Mode ──────────────────────────────────────────── */
function enableAdminMode() {
  document.getElementById('adminBar').style.display = 'flex';
  document.getElementById('site').classList.add('admin-mode');

  // Enable contenteditable on bio
  const bio = document.getElementById('aboutText');
  if (bio) bio.contentEditable = 'true';

  showToast('Admin mode unlocked — all fields are now editable');
}

function logout() {
  // Lock down
  document.getElementById('adminBar').style.display = 'none';
  document.getElementById('site').classList.remove('admin-mode');

  const bio = document.getElementById('aboutText');
  if (bio) bio.contentEditable = 'false';

  // Reset login form
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('emailInput').value    = '';
  document.getElementById('emailErr').textContent = '';
  document.getElementById('otpErr').textContent   = '';
  document.querySelectorAll('.otp-box').forEach(b => {
    b.value = '';
    b.classList.remove('filled');
    b.style.borderColor = '';
  });

  const sendBtn = document.getElementById('sendOtpBtn');
  sendBtn.disabled    = false;
  sendBtn.textContent = 'Send one-time code';

  clearInterval(resendTimer);

  // Show floating login button
  const trigger = document.getElementById('loginTrigger');
  trigger.style.display = 'flex';

  showToast('Logged out successfully');
}

function saveProfile() {
  // TODO: persist data via API when backend is ready
  showToast('Profile saved ✓');
}

/* ─── OTP input navigation ────────────────────────────────── */
document.querySelectorAll('.otp-box').forEach((box, i, arr) => {
  box.addEventListener('input', e => {
    const v = e.target.value.replace(/\D/g, '');
    e.target.value = v ? v[0] : '';
    if (v) {
      e.target.classList.add('filled');
      e.target.style.borderColor = '';
      if (i < arr.length - 1) arr[i + 1].focus();
    } else {
      e.target.classList.remove('filled');
    }
    document.getElementById('otpErr').textContent = '';
  });

  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) arr[i - 1].focus();
    if (e.key === 'Enter') verifyOTP();
  });

  box.addEventListener('paste', e => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData)
      .getData('text').replace(/\D/g, '').slice(0, 6);
    paste.split('').forEach((c, j) => {
      if (arr[j]) {
        arr[j].value = c;
        arr[j].classList.add('filled');
      }
    });
    const next = Math.min(paste.length, arr.length - 1);
    arr[next].focus();
  });
});

/* ─── Video upload ────────────────────────────────────────── */
document.getElementById('videoInput').addEventListener('change', function(e) {
  Array.from(e.target.files).forEach(file => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-thumb">
        <div class="play-btn">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="video-info">
        <div class="video-title">${file.name}</div>
        <div class="video-meta">Uploaded just now</div>
      </div>`;
    const grid   = document.getElementById('videoGrid');
    const upload = document.getElementById('videoUploadCard');
    grid.insertBefore(card, upload);
  });
  showToast('Video added');
});

/* ─── Document upload ─────────────────────────────────────── */
document.getElementById('docInput').addEventListener('change', function(e) {
  Array.from(e.target.files).forEach(file => {
    const kb  = Math.round(file.size / 1024);
    const div = document.createElement('div');
    div.className = 'doc-row';
    div.innerHTML = `
      <div class="doc-icon">
        <svg width="16" height="16" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <span class="doc-name">${file.name}</span>
      <span class="doc-size">${kb} KB</span>`;
    document.getElementById('docList').appendChild(div);
  });
  showToast('Document uploaded');
});

/* ─── Add tournament row ──────────────────────────────────── */
function addTournament() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><span class="place-badge place-mid" style="width:auto;padding:0 8px">
      <input class="ef" value="—" style="width:30px;text-align:center;font-weight:700;pointer-events:all;border-bottom:1px dashed rgba(201,168,76,0.45)">
    </span></td>
    <td><div class="tourn-name">
      <input class="ef" value="Tournament name" style="width:200px;pointer-events:all;border-bottom:1px dashed rgba(201,168,76,0.45)">
    </div></td>
    <td><span class="tourn-date">
      <input class="ef" value="Mon YYYY" style="width:80px;pointer-events:all;border-bottom:1px dashed rgba(201,168,76,0.45)">
    </span></td>
    <td><span class="score-chip">
      <input class="ef score-ef" value="—" style="pointer-events:all;border-bottom:1px dashed rgba(201,168,76,0.45)">
    </span></td>
    <td class="lb-col">
      <a class="lb-link" href="#" target="_blank" rel="noopener noreferrer" title="View leaderboard">Leaderboard ↗</a>
      <input class="ef lb-url-ef" value="" placeholder="Leaderboard URL" style="pointer-events:all;border-bottom:1px dashed rgba(201,168,76,0.45)">
    </td>
    <td><button class="del-btn" style="display:inline-block" onclick="this.closest('tr').remove()">✕</button></td>`;
  document.getElementById('tournBody').appendChild(tr);
  tr.querySelector('input').focus();
}

/* ─── Sync leaderboard URL input with its link ───────────── */
document.getElementById('tournBody').addEventListener('input', e => {
  if (!e.target.classList.contains('lb-url-ef')) return;
  const link = e.target.closest('.lb-col').querySelector('.lb-link');
  link.href = e.target.value.trim() || '#';
});

/* ─── Enter key on email field ────────────────────────────── */
document.getElementById('emailInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendOTP();
});
