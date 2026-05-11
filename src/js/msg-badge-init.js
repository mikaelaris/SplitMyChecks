// msg-badge-init.js — runs on every app page
// 1. Updates the unread message badge count
// 2. Intercepts the Messages button click for guests
(function () {
  function _user() {
    try { return JSON.parse(localStorage.getItem('smc_current_user') || 'null'); } catch { return null; }
  }
  function _convKey() {
    const u = _user();
    return 'smc_conversations_' + (u ? String(u.id) : 'guest');
  }

  function updateBadge() {
    const btn = document.getElementById('msg-header-btn');
    if (!btn) return;

    const u = _user();

    // If guest, intercept click and show toast instead of navigating
    if (!u || u.isGuest) {
      btn.style.opacity = '0.5';
      btn.title = 'Create a free account to use Messages';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Show a small toast
        const existing = document.getElementById('_guest_msg_toast');
        if (existing) return;
        const toast = document.createElement('div');
        toast.id = '_guest_msg_toast';
        toast.textContent = '🔒 Create a free account to use Messages';
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
          'padding:10px 22px;border-radius:99px;font-size:0.875rem;font-weight:600;' +
          'background:#EF4444;color:white;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.15);' +
          'white-space:nowrap;pointer-events:none;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }, true); // capture phase — fires before any other listener
      return;
    }

    // Registered user: show unread badge
    try {
      const convs = JSON.parse(localStorage.getItem(_convKey()) || '[]');
      const total = convs.reduce((s, c) => s + (c.unread || 0), 0);
      const badge = btn.querySelector('.msg-badge');
      if (!badge) return;
      if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        btn.classList.add('has-unread');
      } else {
        btn.classList.remove('has-unread');
      }
    } catch (e) {}
  }

  updateBadge();
  document.addEventListener('DOMContentLoaded', updateBadge);
  window.addEventListener('focus', updateBadge);
  window.updateMsgBadge = updateBadge;
})();
