// appCore.js — runs on every app page (setup, items, results)
// Handles: auth guard, apply customisation, populate header avatar

export function initApp({ requireLogin = false } = {}) {
  const user = JSON.parse(localStorage.getItem('smc_current_user') || 'null');

  // Auth guard
  if (!user) {
    if (requireLogin) {
      window.location.href = 'index.html';
      return null;
    }
    // Auto-login as guest so app still works without login
    const guest = { id: 'guest', displayName: 'Guest', username: 'guest', avatarColour: '#A09890', isGuest: true };
    localStorage.setItem('smc_current_user', JSON.stringify(guest));
    return guest;
  }

  applyCustomisation();
  populateHeaderAvatar(user);
  initThemeToggle();

  return user;
}

function applyCustomisation() {
  const prefs = JSON.parse(localStorage.getItem('smc_prefs') || '{}');

  if (prefs.accentColour) {
    const hex = prefs.accentColour;
    document.documentElement.style.setProperty('--brand', hex);
    document.documentElement.style.setProperty('--brand-light', adjustHex(hex, 20));
    document.documentElement.style.setProperty('--brand-dark',  adjustHex(hex, -15));
    document.documentElement.style.setProperty('--brand-bg', hex + '14');
    // Keep --accent in sync so the loader middle dot matches the chosen colour
    document.documentElement.style.setProperty('--accent', adjustHex(hex, 20));
  }

  if (prefs.fontSize) {
    document.documentElement.style.fontSize = prefs.fontSize + 'px';
  }

  const savedTheme = prefs.theme
    ? (prefs.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : prefs.theme)
    : (localStorage.getItem('theme') || 'light');

  document.documentElement.setAttribute('data-theme', savedTheme);

  const ttx = document.querySelector('.theme-toggle-text');
  if (ttx) ttx.textContent = savedTheme === 'light' ? '🌙' : '☀️';
}

function populateHeaderAvatar(user) {
  const btn = document.getElementById('header-avatar');
  if (!btn) return;
  const initials = (user.displayName || 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  btn.textContent = initials;
  btn.style.background = user.avatarColour || '#FF6B4A';
}

function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const ttx    = document.querySelector('.theme-toggle-text');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    // persist in prefs too
    const prefs = JSON.parse(localStorage.getItem('smc_prefs') || '{}');
    prefs.theme = next;
    localStorage.setItem('smc_prefs', JSON.stringify(prefs));
    if (ttx) ttx.textContent = next === 'light' ? '🌙' : '☀️';
  });
}

function adjustHex(hex, amt) {
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

// Shared helpers used across pages
export function getPrefs() { return JSON.parse(localStorage.getItem('smc_prefs') || '{}'); }
export function getFriends() { return JSON.parse(localStorage.getItem('smc_friends') || '[]'); }
export function getPaymentMethods() { return JSON.parse(localStorage.getItem('smc_payments') || '[]'); }
