// msg-badge-init.js — updates the header messages button badge
// Include as a regular <script> tag at the bottom of every page body.
(function () {
  function _convKey() {
    try {
      const u = JSON.parse(localStorage.getItem('smc_current_user') || 'null');
      return 'smc_conversations_' + (u ? String(u.id) : 'guest');
    } catch { return 'smc_conversations_guest'; }
  }

  function updateBadge() {
    const btn = document.getElementById('msg-header-btn');
    if (!btn) return;
    try {
      const convs = JSON.parse(localStorage.getItem(_convKey()) || '[]');
      const total = convs.reduce((sum, c) => sum + (c.unread || 0), 0);
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
