// profile.js — Full profile page logic

// ── Auth guard ──────────────────────────────────────────────
const AVATAR_COLORS = ['#FF6B4A','#6C63FF','#22C55E','#F59E0B','#0EA5E9','#EC4899','#14B8A6','#8B5CF6','#EF4444','#1E293B'];

function getUser()     { return JSON.parse(localStorage.getItem('smc_current_user') || 'null'); }
function saveUser(u)   { localStorage.setItem('smc_current_user', JSON.stringify(u)); }
function getPrefs()    { return JSON.parse(localStorage.getItem('smc_prefs') || '{}'); }
function savePrefs(p)  { localStorage.setItem('smc_prefs', JSON.stringify(p)); }

// ── User-scoped storage keys ──────────────────────────────────
function _userId() {
  try {
    const u = JSON.parse(localStorage.getItem('smc_current_user') || 'null');
    return u ? String(u.id) : 'guest';
  } catch { return 'guest'; }
}
function friendsKey()   { return `smc_friends_${_userId()}`; }
function paymentsKey()  { return `smc_payments_${_userId()}`; }
function activitiesKey(){ return `activities_${_userId()}`; }

function getFriends()   { return JSON.parse(localStorage.getItem(friendsKey())  || '[]'); }
function saveFriends(f) { localStorage.setItem(friendsKey(),  JSON.stringify(f)); }
function getPayments()  { return JSON.parse(localStorage.getItem(paymentsKey()) || '[]'); }
function savePayments(p){ localStorage.setItem(paymentsKey(), JSON.stringify(p)); }

// ── Apply saved customisation on every page load ─────────────
function applyCustomisation() {
  const prefs = getPrefs();
  if (prefs.accentColour) {
    setAccentColour(prefs.accentColour);
  }
  if (prefs.fontSize) {
    document.documentElement.style.fontSize = prefs.fontSize + 'px';
  }
  if (prefs.theme) {
    const theme = prefs.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : prefs.theme;
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function setAccentColour(hex) {
  // Compute lighter/darker shades automatically
  document.documentElement.style.setProperty('--brand', hex);
  document.documentElement.style.setProperty('--brand-light', lighten(hex, 20));
  document.documentElement.style.setProperty('--brand-dark', darken(hex, 15));
  document.documentElement.style.setProperty('--brand-bg', hex + '14');
}

function lighten(hex, amt) {
  return adjustColour(hex, amt);
}
function darken(hex, amt) {
  return adjustColour(hex, -amt);
}
function adjustColour(hex, amt) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

// ── Loader ──────────────────────────────────────────────────
const loaderWrapper = document.getElementById('loader-wrapper');
window.addEventListener('load', () => {
  setTimeout(() => loaderWrapper?.classList.add('loader-hidden'), 800);
});

applyCustomisation();

// ── Init theme ───────────────────────────────────────────────
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const themeToggle = document.getElementById('theme-toggle');
const themeToggleText = document.querySelector('.theme-toggle-text');
if (themeToggle) {
  themeToggleText.textContent = savedTheme === 'light' ? '🌙' : '☀️';
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggleText.textContent = next === 'light' ? '🌙' : '☀️';
  });
}

// ── Redirect if not logged in ────────────────────────────────
const user = getUser();
if (!user) { window.location.href = 'index.html'; }

// ── Populate profile hero ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateCurrencyDropdown();
  renderProfileHero();
  renderFriends();
  renderPayments();
  renderCustomise();
  renderAccount();
  setupTabSwitching();
  setupFriends();
  setupPayments();
  setupCustomise();
  setupAccount();
  setupEditProfile();
  setupAvatarPicker();

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('smc_current_user');
    window.location.href = 'index.html';
  });
});

function renderProfileHero() {
  const u = getUser();
  const activities = JSON.parse(localStorage.getItem(activitiesKey()) || '[]');
  const initials = (u.displayName || u.first || 'G').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const avatar = document.getElementById('profile-avatar');
  avatar.textContent = initials;
  avatar.style.background = u.avatarColour || '#FF6B4A';
  document.getElementById('profile-name').textContent = u.displayName || 'Guest User';
  document.getElementById('profile-username').textContent = u.isGuest ? 'Browsing as guest' : `@${u.username}`;
  document.getElementById('profile-type-badge').textContent = u.isGuest ? '👤 Guest' : '✅ Member';
  document.getElementById('profile-activities-badge').textContent = `${activities.length} activit${activities.length !== 1 ? 'ies' : 'y'}`;

  if (u.isGuest) {
    document.getElementById('edit-profile-btn').style.display = 'none';
  }
}

// ── Tab switching ────────────────────────────────────────────
function setupTabSwitching() {
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// ── Friends ──────────────────────────────────────────────────
function renderFriends() {
  const friends = getFriends();
  document.getElementById('friends-count').textContent = friends.length;
  const list = document.getElementById('friends-list');

  if (friends.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">👋</div><p>No friends added yet. Add friends to quickly include them in activities!</p></div>`;
    return;
  }

  list.innerHTML = friends.map((f, i) => {
    const initials = (f.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
    return `
      <div class="friend-card">
        <div class="friend-avatar" style="background:${color}">${initials}</div>
        <div class="friend-info">
          <div class="friend-name">${f.name}</div>
          <div class="friend-meta">${f.email ? f.email : f.username ? '@' + f.username : 'Manual entry'}</div>
        </div>
        <div class="friend-actions">
          <button class="btn btn-ghost" style="font-size:0.8rem;padding:6px 10px;" onclick="removeFriend(${f.id})">Remove</button>
        </div>
      </div>`;
  }).join('');
}

function setupFriends() {
  document.getElementById('add-friend-btn').addEventListener('click', () => {
    const query = document.getElementById('friend-search').value.trim();
    if (!query) { showToast('Enter a username or name to search', 'error'); return; }

    // Check registered users
    const users = JSON.parse(localStorage.getItem('smc_users') || '[]');
    const found = users.find(u => u.username === query.toLowerCase() || u.displayName?.toLowerCase() === query.toLowerCase());
    if (found) {
      addFriend({ id: Date.now(), name: found.displayName, email: found.email, username: found.username });
    } else {
      showToast('No registered user found. Use "Add manually" below.', 'error');
    }
    document.getElementById('friend-search').value = '';
  });

  document.getElementById('add-manual-btn').addEventListener('click', () => {
    const name  = document.getElementById('manual-name').value.trim();
    const email = document.getElementById('manual-email').value.trim();
    if (!name) { showToast('Please enter a name', 'error'); return; }
    addFriend({ id: Date.now(), name, email });
    document.getElementById('manual-name').value = '';
    document.getElementById('manual-email').value = '';
  });
}

function addFriend(f) {
  const friends = getFriends();
  if (friends.find(x => x.email && x.email === f.email)) { showToast('Already in your friends list', 'error'); return; }
  friends.push(f);
  saveFriends(friends);
  renderFriends();
  showToast(`${f.name} added to friends! 🎉`, 'success');
}

window.removeFriend = function(id) {
  if (!confirm('Remove this friend?')) return;
  saveFriends(getFriends().filter(f => f.id !== id));
  renderFriends();
  showToast('Friend removed', 'success');
};

// ── Payment methods ──────────────────────────────────────────
const PAYMENT_ICONS = {
  paypal: '🅿️', venmo: '💙', revolut: '🔵', wise: '🌍',
  bank: '🏦', cashapp: '$', other: '💰'
};
const PAYMENT_LABELS = {
  paypal: 'PayPal', venmo: 'Venmo', revolut: 'Revolut',
  wise: 'Wise', bank: 'Bank transfer', cashapp: 'Cash App', other: 'Other'
};
const PAYMENT_PLACEHOLDERS = {
  paypal: '@paypal-email', venmo: '@venmo-username', revolut: '@revolut-tag',
  wise: '@wise-handle', bank: 'IBAN or account number', cashapp: '$cashtag', other: 'Details'
};

function renderPayments() {
  const payments = getPayments();
  document.getElementById('payments-count').textContent = payments.length;
  const list = document.getElementById('payments-list');

  if (payments.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">💳</div><p>Add a payment method so friends can pay you directly from the results page.</p></div>`;
    return;
  }

  list.innerHTML = payments.map((p, i) => `
    <div class="payment-card">
      <div class="payment-icon">${PAYMENT_ICONS[p.type] || '💰'}</div>
      <div class="payment-info">
        <div class="payment-name">${p.nickname || PAYMENT_LABELS[p.type]}${i === 0 ? '<span class="payment-default-badge">Default</span>' : ''}</div>
        <div class="payment-handle">${p.detail}</div>
      </div>
      <div style="display:flex;gap:6px;">
        ${i !== 0 ? `<button class="btn btn-ghost" style="font-size:0.8rem;padding:6px 10px;" onclick="setDefaultPayment(${p.id})">Set default</button>` : ''}
        <button class="btn btn-ghost" style="font-size:0.8rem;padding:6px 10px;color:var(--danger);" onclick="removePayment(${p.id})">Remove</button>
      </div>
    </div>`).join('');
}

function setupPayments() {
  const typeSelect = document.getElementById('payment-type');
  typeSelect.addEventListener('change', () => {
    const t = typeSelect.value;
    document.getElementById('payment-detail').placeholder = PAYMENT_PLACEHOLDERS[t] || 'Handle / account';
    document.getElementById('payment-detail-label').textContent = t === 'bank' ? 'IBAN / Account number' : 'Handle / username';
  });

  document.getElementById('save-payment-btn').addEventListener('click', () => {
    const type   = document.getElementById('payment-type').value;
    const detail = document.getElementById('payment-detail').value.trim();
    const nick   = document.getElementById('payment-nickname').value.trim();
    if (!type) { showToast('Select a payment type', 'error'); return; }
    if (!detail) { showToast('Enter your handle or account', 'error'); return; }

    const payments = getPayments();
    payments.push({ id: Date.now(), type, detail, nickname: nick });
    savePayments(payments);
    renderPayments();
    showToast('Payment method saved! 💳', 'success');
    document.getElementById('payment-type').value = '';
    document.getElementById('payment-detail').value = '';
    document.getElementById('payment-nickname').value = '';
  });
}

window.removePayment = function(id) {
  savePayments(getPayments().filter(p => p.id !== id));
  renderPayments();
};

window.setDefaultPayment = function(id) {
  let payments = getPayments();
  const idx = payments.findIndex(p => p.id === id);
  if (idx > 0) {
    const [item] = payments.splice(idx, 1);
    payments.unshift(item);
    savePayments(payments);
    renderPayments();
    showToast('Default payment method updated', 'success');
  }
};

// ── Customise ────────────────────────────────────────────────
function renderCustomise() {
  const prefs = getPrefs();

  // Colour swatches
  const savedColour = prefs.accentColour || '#FF6B4A';
  document.querySelectorAll('#colour-grid .colour-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.colour === savedColour);
  });

  // Font size
  const fontSize = prefs.fontSize || 16;
  document.getElementById('font-size-slider').value = fontSize;
  document.getElementById('font-size-label').textContent = `${fontSize}px${fontSize == 16 ? ' (default)' : ''}`;
  document.getElementById('font-preview').style.fontSize = fontSize + 'px';

  // Theme
  const theme = prefs.theme || 'light';
  document.querySelectorAll('.appearance-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.theme === theme);
  });

  // Default currency
  const dc = prefs.defaultCurrency || '';
  const sel = document.getElementById('default-currency');
  if (sel) sel.value = dc;

  // Prefs toggles
  document.getElementById('pref-round').checked = prefs.roundAmounts || false;
  document.getElementById('pref-autoselect').checked = prefs.autoSelectAll !== false;
  document.getElementById('pref-compact').checked = prefs.compact || false;
}

function setupCustomise() {
  // Colour swatches
  document.querySelectorAll('#colour-grid .colour-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('#colour-grid .colour-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const colour = swatch.dataset.colour;
      setAccentColour(colour);
      savePrefs({ ...getPrefs(), accentColour: colour });
      showToast('Colour updated!', 'success');
    });
  });

  // Custom colour
  document.getElementById('apply-custom-colour').addEventListener('click', () => {
    const colour = document.getElementById('custom-colour').value;
    document.querySelectorAll('#colour-grid .colour-swatch').forEach(s => s.classList.remove('active'));
    setAccentColour(colour);
    savePrefs({ ...getPrefs(), accentColour: colour });
    showToast('Custom colour applied!', 'success');
  });

  // Font size slider
  const slider = document.getElementById('font-size-slider');
  slider.addEventListener('input', () => {
    const size = parseInt(slider.value);
    document.documentElement.style.fontSize = size + 'px';
    document.getElementById('font-size-label').textContent = `${size}px${size == 16 ? ' (default)' : ''}`;
    document.getElementById('font-preview').style.fontSize = size + 'px';
    savePrefs({ ...getPrefs(), fontSize: size });
  });

  // Theme buttons
  document.querySelectorAll('.appearance-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.appearance-opt').forEach(o => o.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.theme;
      const applied = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      document.documentElement.setAttribute('data-theme', applied);
      localStorage.setItem('theme', applied);
      const ttx = document.querySelector('.theme-toggle-text');
      if (ttx) ttx.textContent = applied === 'light' ? '🌙' : '☀️';
      savePrefs({ ...getPrefs(), theme: t });
    });
  });

  // Default currency
  document.getElementById('default-currency').addEventListener('change', e => {
    savePrefs({ ...getPrefs(), defaultCurrency: e.target.value });
    showToast('Default currency saved', 'success');
  });

  // Preference toggles
  ['pref-round', 'pref-autoselect', 'pref-compact'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const keyMap = { 'pref-round': 'roundAmounts', 'pref-autoselect': 'autoSelectAll', 'pref-compact': 'compact' };
      savePrefs({ ...getPrefs(), [keyMap[id]]: e.target.checked });
    });
  });
}

// ── Account tab ──────────────────────────────────────────────
function renderAccount() {
  const u = getUser();
  const activities = JSON.parse(localStorage.getItem(activitiesKey()) || '[]');
  const totalItems = activities.reduce((s, a) => s + (a.items?.length || 0), 0);
  document.getElementById('data-summary').textContent = `${activities.length} activities · ${totalItems} items`;

  if (u.isGuest) {
    document.getElementById('account-guest-msg').style.display = 'flex';
    document.getElementById('account-details').style.display = 'none';
    document.getElementById('delete-account-btn').style.display = 'none';
  } else {
    document.getElementById('account-guest-msg').style.display = 'none';
    document.getElementById('account-details').style.display = 'block';
    document.getElementById('delete-account-btn').style.display = 'block';
    document.getElementById('acc-name').textContent = u.displayName || '—';
    document.getElementById('acc-username').textContent = `@${u.username}`;
    document.getElementById('acc-email').textContent = u.email;
    document.getElementById('acc-since').textContent = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
  }
}

function setupAccount() {
  // Export data
  document.getElementById('export-data-btn').addEventListener('click', () => {
    const data = {
      activities: JSON.parse(localStorage.getItem(activitiesKey()) || '[]'),
      friends: getFriends(),
      payments: getPayments(),
      prefs: getPrefs(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `splitmy_data_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('Data exported!', 'success');
  });

  // Import data
  document.getElementById('import-data-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.activities) localStorage.setItem(activitiesKey(), JSON.stringify(data.activities));
        if (data.friends)    saveFriends(data.friends);
        if (data.payments)   savePayments(data.payments);
        if (data.prefs)      savePrefs(data.prefs);
        showToast('Data imported successfully! 🎉', 'success');
        renderAccount();
        renderFriends();
        renderPayments();
      } catch {
        showToast('Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Clear data
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    if (!confirm('This will permanently delete all your local activities, items, and settings. Are you sure?')) return;
    [activitiesKey(), friendsKey(), paymentsKey(), 'smc_prefs'].forEach(k => localStorage.removeItem(k));
    showToast('All data cleared', 'success');
    setTimeout(() => window.location.reload(), 1000);
  });

  // Delete account
  document.getElementById('delete-account-btn').addEventListener('click', () => {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return;
    const users = JSON.parse(localStorage.getItem('smc_users') || '[]');
    const u = getUser();
    const filtered = users.filter(x => x.id !== u.id);
    localStorage.setItem('smc_users', JSON.stringify(filtered));
    ['smc_current_user', activitiesKey(), friendsKey(), paymentsKey(), 'smc_prefs'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
  });
}

// ── Edit profile modal ───────────────────────────────────────
function setupEditProfile() {
  const modal = document.getElementById('edit-profile-modal');

  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    const u = getUser();
    document.getElementById('edit-display-name').value = u.displayName || '';
    document.getElementById('edit-bio').value = u.bio || '';
    modal.style.display = 'flex';
  });

  document.getElementById('save-profile-btn').addEventListener('click', () => {
    const u = getUser();
    u.displayName = document.getElementById('edit-display-name').value.trim() || u.displayName;
    u.bio = document.getElementById('edit-bio').value.trim();
    saveUser(u);

    // Also update in users list
    const users = JSON.parse(localStorage.getItem('smc_users') || '[]');
    const idx = users.findIndex(x => x.id === u.id);
    if (idx !== -1) { users[idx] = { ...users[idx], displayName: u.displayName, bio: u.bio }; localStorage.setItem('smc_users', JSON.stringify(users)); }

    modal.style.display = 'none';
    renderProfileHero();
    showToast('Profile updated!', 'success');
  });

  // Close modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
  });
}

// ── Avatar colour picker ─────────────────────────────────────
function setupAvatarPicker() {
  const modal = document.getElementById('avatar-modal');
  document.getElementById('avatar-edit-btn').addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  document.querySelectorAll('#avatar-colour-grid .colour-swatch').forEach(s => {
    s.addEventListener('click', () => {
      const colour = s.dataset.colour;
      const u = getUser();
      u.avatarColour = colour;
      saveUser(u);
      document.getElementById('profile-avatar').style.background = colour;
      modal.style.display = 'none';
      showToast('Avatar updated!', 'success');
    });
  });
}

// ── Currency dropdown ────────────────────────────────────────
function populateCurrencyDropdown() {
  const currencies = {
    '$':'US Dollar','€':'Euro','£':'British Pound','¥':'Japanese Yen',
    '₹':'Indian Rupee','A$':'Australian Dollar','C$':'Canadian Dollar',
    'CHF':'Swiss Franc','元':'Chinese Yuan','₩':'Korean Won',
    'kr':'Swedish Krona','₪':'Israeli Shekel','S$':'Singapore Dollar',
    '฿':'Thai Baht','R$':'Brazilian Real','₱':'Philippine Peso',
    'zł':'Polish Złoty','RM':'Malaysian Ringgit','﷼':'Saudi Riyal',
    'HK$':'Hong Kong Dollar','₺':'Turkish Lira'
  };
  const sel = document.getElementById('default-currency');
  if (!sel) return;
  sel.innerHTML = '<option value="">No default</option>' +
    Object.entries(currencies).sort((a,b) => a[1].localeCompare(b[1]))
      .map(([sym, name]) => `<option value="${sym}">${name} (${sym})</option>`).join('');
  const saved = getPrefs().defaultCurrency || '';
  sel.value = saved;
}

// ── Toast ────────────────────────────────────────────────────
function showToast(text, type = 'success') {
  const existing = document.querySelector('.profile-toast');
  existing?.remove();
  const el = document.createElement('div');
  el.className = 'profile-toast success-message';
  el.textContent = text;
  if (type === 'error') el.style.background = '#EF4444';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
