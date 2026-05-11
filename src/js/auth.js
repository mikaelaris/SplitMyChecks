// auth.js — Handles login, registration, guest sessions
// All storage is localStorage (simulated auth — no real server)

const Auth = {
  // Hash a password (simple but not cryptographic — demo only)
  hashPassword(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = ((hash << 5) - hash) + pw.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  },

  getUsers() {
    return JSON.parse(localStorage.getItem('smc_users') || '[]');
  },

  saveUsers(users) {
    localStorage.setItem('smc_users', JSON.stringify(users));
  },

  getCurrentUser() {
    const raw = localStorage.getItem('smc_current_user');
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem('smc_current_user', JSON.stringify(user));
    // Let theme-init.js know which user's prefs to load on the next page paint
    localStorage.setItem('smc_last_user_id', String(user.id));
  },

  logout() {
    localStorage.removeItem('smc_current_user');
    localStorage.removeItem('smc_last_user_id');
    window.location.href = 'index.html';
  },

  register(first, last, email, username, password) {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered.' };
    if (users.find(u => u.username === username)) return { ok: false, msg: 'Username already taken.' };
    if (password.length < 8) return { ok: false, msg: 'Password must be at least 8 characters.' };

    const user = {
      id: Date.now(),
      first, last,
      displayName: `${first} ${last}`.trim(),
      email,
      username,
      passwordHash: this.hashPassword(password),
      avatarColour: '#FF6B4A',
      bio: '',
      createdAt: new Date().toISOString(),
      isGuest: false,
    };

    users.push(user);
    this.saveUsers(users);
    // Restore full user object (may have been updated since last login)
    this.setCurrentUser(user);
    return { ok: true, user };
  },

  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    if (!user) return { ok: false, msg: 'No account found with that email.' };
    if (user.passwordHash !== this.hashPassword(password)) return { ok: false, msg: 'Incorrect password.' };
    // Restore full user object (may have been updated since last login)
    this.setCurrentUser(user);
    return { ok: true, user };
  },

  loginAsGuest() {
    const guest = {
      id: 'guest',
      displayName: 'Guest User',
      username: 'guest',
      email: '',
      avatarColour: '#6B6560',
      isGuest: true,
    };
    this.setCurrentUser(guest);
    localStorage.setItem('smc_last_user_id', 'guest');
    return guest;
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }
};

// ── Page Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in as a real user, skip auth page.
  // Guests are NOT redirected — they may be here to create an account.
  const _existing = Auth.getCurrentUser();
  if (_existing && !_existing.isGuest) {
    window.location.href = 'setup.html';
    return;
  }
  // Clear any stale guest session so the auth page starts clean
  if (_existing && _existing.isGuest) {
    localStorage.removeItem('smc_current_user');
  }

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${target}-form`).classList.add('active');
    });
  });

  // Password visibility toggles
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  // Password strength meter
  const regPw = document.getElementById('reg-password');
  const strengthBar = document.getElementById('pw-strength');
  if (regPw && strengthBar) {
    regPw.addEventListener('input', () => {
      const pw = regPw.value;
      let score = 0;
      if (pw.length >= 8) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      const widths = ['0%', '25%', '50%', '75%', '100%'];
      const colors = ['#E8E2DA', '#EF4444', '#F59E0B', '#22C55E', '#16A34A'];
      strengthBar.style.setProperty('--pw-width', widths[score]);
      strengthBar.style.setProperty('--pw-color', colors[score]);
    });
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const result   = Auth.login(email, password);
    if (result.ok) {
      showMsg('Welcome back! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'setup.html', 900);
    } else {
      showMsg(result.msg, 'error');
    }
  });

  // Register form
  document.getElementById('register-form').addEventListener('submit', e => {
    e.preventDefault();
    const first    = document.getElementById('reg-first').value.trim();
    const last     = document.getElementById('reg-last').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    if (!first) { showMsg('Please enter your first name.', 'error'); return; }
    if (!email)  { showMsg('Please enter your email.', 'error'); return; }
    if (!username) { showMsg('Please choose a username.', 'error'); return; }

    const result = Auth.register(first, last, email, username, password);
    if (result.ok) {
      showMsg('Account created! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'setup.html', 900);
    } else {
      showMsg(result.msg, 'error');
    }
  });

  // Guest buttons
  ['guest-btn', 'guest-btn-2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      Auth.loginAsGuest();
      window.location.href = 'setup.html';
    });
  });
});

function showMsg(text, type) {
  const existing = document.querySelector('.auth-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = `auth-toast auth-toast-${type}`;
  el.textContent = text;
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    padding:10px 22px;border-radius:99px;font-size:0.875rem;font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;
    background:${type === 'success' ? '#16A34A' : '#EF4444'};color:white;
    animation:fadeSlideUp 0.3s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Make Auth global for other pages
window.Auth = Auth;