// navigation.js — Activity-aware navigation modal

function showActivitySelector(destination) {
  const modal = document.getElementById('activity-select-modal');
  const list  = document.getElementById('activity-select-list');
  if (!modal || !list) return;

  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  if (activities.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--text-3);">
        <div style="font-size:2rem;margin-bottom:8px;">📭</div>
        <p>No activities yet.</p>
        <a href="setup.html" style="color:var(--brand);font-weight:600;">Create one first →</a>
      </div>`;
  } else {
    list.innerHTML = activities.map(a => `
      <button class="activity-select-btn" onclick="navigateTo('${destination}', ${a.id})">
        <span class="asel-name">${a.name}</span>
        <span class="asel-meta">${a.people.length} people · ${a.baseCurrency} · ${a.items?.length || 0} items</span>
      </button>
    `).join('');
  }

  modal.style.display = 'flex';
}

function navigateTo(destination, activityId) {
  const pageMap = { items: 'items.html', results: 'results.html', setup: 'setup.html' };
  window.location.href = `${pageMap[destination] || destination}?activity=${activityId}`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').style.display = 'none';
    });
  });
});

window.showActivitySelector = showActivitySelector;
window.navigateTo = navigateTo;
