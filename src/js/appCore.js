// appCore.js — runs on every app page (setup, items, results)
// Handles: auth guard, apply customisation, populate header avatar

// ── User ID helper (used by all scoped keys) ─────────────────
export function _userId() {
  try {
    const u = JSON.parse(localStorage.getItem('smc_current_user') || 'null');
    return u ? String(u.id) : 'guest';
  } catch { return 'guest'; }
}

// ── Scoped storage keys ───────────────────────────────────────
export function prefsKey()          { return `smc_prefs_${_userId()}`; }
export function friendsKey()        { return `smc_friends_${_userId()}`; }
export function paymentsKey()       { return `smc_payments_${_userId()}`; }
export function conversationsKey()  { return `smc_conversations_${_userId()}`; }
export function activitiesKey()     { const id = _userId(); return `activities_${id}`; }

// ── Scoped getters / setters ──────────────────────────────────
export function getPrefs()           { return JSON.parse(localStorage.getItem(prefsKey())           || '{}'); }
export function savePrefs(p)         { localStorage.setItem(prefsKey(),          JSON.stringify(p)); }
export function getFriends()         { return JSON.parse(localStorage.getItem(friendsKey())         || '[]'); }
export function saveFriends(f)       { localStorage.setItem(friendsKey(),        JSON.stringify(f)); }
export function getPaymentMethods()  { return JSON.parse(localStorage.getItem(paymentsKey())        || '[]'); }
export function savePaymentMethods(p){ localStorage.setItem(paymentsKey(),       JSON.stringify(p)); }
export function getConversations()   { return JSON.parse(localStorage.getItem(conversationsKey())   || '[]'); }
export function saveConversations(c) { localStorage.setItem(conversationsKey(),  JSON.stringify(c)); }
export function getActivities()      { return JSON.parse(localStorage.getItem(activitiesKey())      || '[]'); }
export function saveActivities(a)    { localStorage.setItem(activitiesKey(),     JSON.stringify(a)); }

// ── initApp ───────────────────────────────────────────────────
export function initApp({ requireLogin = false } = {}) {
  const user = JSON.parse(localStorage.getItem('smc_current_user') || 'null');

  if (!user) {
    if (requireLogin) { window.location.href = 'index.html'; return null; }
    const guest = { id: 'guest', displayName: 'Guest', username: 'guest', avatarColour: '#A09890', isGuest: true };
    localStorage.setItem('smc_current_user', JSON.stringify(guest));
    // Remember which prefs key to load on next paint
    localStorage.setItem('smc_last_user_id', 'guest');
    return guest;
  }

  // Remember last user so theme-init.js can load the right prefs on next page load
  localStorage.setItem('smc_last_user_id', String(user.id));

  applyCustomisation(user);
  populateHeaderAvatar(user);
  initThemeToggle();
  return user;
}

// ── Apply customisation from THIS user's scoped prefs ─────────
function applyCustomisation(user) {
  const prefs = getPrefs();

  // Accent colour — fall back to user's avatarColour if no prefs set yet
  const hex = prefs.accentColour || (user && user.avatarColour) || null;
  if (hex && hex !== '#A09890') {
    document.documentElement.style.setProperty('--brand',       hex);
    document.documentElement.style.setProperty('--brand-light', adjustHex(hex,  20));
    document.documentElement.style.setProperty('--brand-dark',  adjustHex(hex, -15));
    document.documentElement.style.setProperty('--brand-bg',    hex + '14');
    document.documentElement.style.setProperty('--accent',      adjustHex(hex, 20));
  }

  if (prefs.fontSize) document.documentElement.style.fontSize = prefs.fontSize + 'px';

  const theme = prefs.theme
    ? (prefs.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : prefs.theme)
    : (localStorage.getItem('theme') || 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const ttx = document.querySelector('.theme-toggle-text');
  if (ttx) ttx.textContent = theme === 'light' ? '🌙' : '☀️';
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
    const prefs = getPrefs();
    prefs.theme = next;
    savePrefs(prefs);
    if (ttx) ttx.textContent = next === 'light' ? '🌙' : '☀️';
  });
}

export function adjustHex(hex, amt) {
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}
