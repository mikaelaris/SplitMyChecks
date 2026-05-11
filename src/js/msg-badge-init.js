// msg-badge-init.js — updates the header messages button badge
// Include as a regular <script> tag at the bottom of every page body.
(function () {
  function updateBadge() {
    const btn = document.getElementById('msg-header-btn');
    if (!btn) return;

    try {
      const convs = JSON.parse(localStorage.getItem('smc_conversations') || '[]');
      const total = convs.reduce((sum, c) => sum + (c.unread || 0), 0);
      const badge = btn.querySelector('.msg-badge');
      if (!badge) return;

      if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        btn.classList.add('has-unread');
      } else {
        btn.classList.remove('has-unread');
      }
    } catch (e) {
      // fail silently
    }
  }

  // Run immediately and again after DOM is ready
  updateBadge();
  document.addEventListener('DOMContentLoaded', updateBadge);

  // Also refresh when the tab regains focus (user comes back from messages page)
  window.addEventListener('focus', updateBadge);

  // Expose so other scripts can call it after marking convs read
  window.updateMsgBadge = updateBadge;
})();
