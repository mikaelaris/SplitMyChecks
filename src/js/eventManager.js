import { showSuccessMessage, populateCurrencySelect, formatCurrency } from './utils.js';
import { initApp, getFriends, getPrefs, getActivities, saveActivities } from './appCore.js';

let editingActivityId = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const loaderWrapper = document.getElementById('loader-wrapper');
  const startTime = Date.now();
  window.addEventListener('load', () => {
    const remaining = Math.max(0, 1200 - (Date.now() - startTime));
    setTimeout(() => loaderWrapper?.classList.add('loader-hidden'), remaining);
  });

  const currencySelect = document.getElementById('base-currency');
  populateCurrencySelect(currencySelect);
  const defaultCurrency = getPrefs().defaultCurrency;
  if (defaultCurrency) currencySelect.value = defaultCurrency;

  const numPeopleInput = document.getElementById('num-people');
  const peopleNamesContainer = document.getElementById('people-names');
  const setupForm = document.getElementById('setup-form');
  const saveBtn = document.getElementById('save-btn');

  // ── Preserve existing names when changing num-people ───────────────────────
  numPeopleInput.addEventListener('input', function () {
    const num = Math.min(parseInt(this.value) || 0, 20);

    const existing = {};
    peopleNamesContainer.querySelectorAll('input[id^="person-"]').forEach(inp => {
      const idx = parseInt(inp.id.replace('person-', ''), 10);
      existing[idx] = inp.value;
    });

    const grid = document.createElement('div');
    grid.className = 'people-grid';
    for (let i = 0; i < num; i++) {
      const item = document.createElement('div');
      item.className = 'person-input-item';
      item.innerHTML = `
        <span class="person-num">${i + 1}</span>
        <input type="text" class="form-control" id="person-${i}"
               placeholder="Person ${i + 1}'s name" autocomplete="off"
               value="${(existing[i] || '').replace(/"/g, '&quot;')}">
      `;
      grid.appendChild(item);
    }
    peopleNamesContainer.innerHTML = '';
    if (num > 0) peopleNamesContainer.appendChild(grid);
  });

  // Friends quick-add banner
  const friends = getFriends();
  if (friends.length > 0) {
    const banner = document.getElementById('friends-banner');
    if (banner) banner.style.display = 'flex';

    document.getElementById('load-friends-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('friends-pick-modal');
      const list  = document.getElementById('friends-pick-list');
      const COLORS = ['#FF6B4A','#6C63FF','#22C55E','#F59E0B','#0EA5E9','#EC4899','#14B8A6','#8B5CF6'];

      list.innerHTML = friends.map((f, i) => {
        const initials = (f.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        const color = COLORS[i % COLORS.length];
        return `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all 0.2s;">
            <input type="checkbox" value="${f.name}" style="width:16px;height:16px;accent-color:var(--brand);">
            <span style="width:32px;height:32px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:0.8rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</span>
            <span style="font-weight:600;font-size:0.9rem;">${f.name}</span>
          </label>`;
      }).join('');

      modal.style.display = 'flex';
    });

    document.getElementById('confirm-friends-btn')?.addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('#friends-pick-list input:checked')).map(c => c.value);
      if (checked.length === 0) return;

      const existing = {};
      peopleNamesContainer.querySelectorAll('input[id^="person-"]').forEach(inp => {
        const idx = parseInt(inp.id.replace('person-', ''), 10);
        existing[idx] = inp.value;
      });

      const currentNum = parseInt(numPeopleInput.value) || 0;
      const newNum = Math.max(currentNum, checked.length);
      numPeopleInput.value = newNum;
      numPeopleInput.dispatchEvent(new Event('input'));

      let slot = 0;
      checked.forEach(name => {
        while (slot < newNum) {
          const el = document.getElementById(`person-${slot}`);
          if (el && el.value.trim() === '') {
            el.value = name;
            slot++;
            break;
          }
          slot++;
        }
      });

      document.getElementById('friends-pick-modal').style.display = 'none';
      showSuccessMessage(`${checked.length} friend${checked.length > 1 ? 's' : ''} added!`);
    });
  }

  setupForm.addEventListener('submit', e => {
    e.preventDefault();
    const activityName = document.getElementById('activity-name').value.trim();
    const baseCurrency = document.getElementById('base-currency').value;
    const inputs       = document.querySelectorAll('#people-names input');

    if (!activityName)       { showError('Please enter an activity name'); return; }
    if (!baseCurrency)       { showError('Please select a base currency'); return; }
    if (inputs.length === 0) { showError('Please add at least one person'); return; }

    const people = Array.from(inputs).map((inp, i) => inp.value.trim() || `Person ${i + 1}`);

    try {
      const activities = getActivities();
      if (editingActivityId) {
        const idx = activities.findIndex(a => a.id === editingActivityId);
        if (idx !== -1) {
          activities[idx] = { ...activities[idx], name: activityName, baseCurrency, people };
          saveActivities(activities);
          editingActivityId = null;
          saveBtn.textContent = 'Save & Continue →';
          showSuccessMessage('Activity updated!');
          setTimeout(() => window.location.href = `items.html?activity=${activities[idx].id}`, 1200);
        }
      } else {
        const activity = {
          id: Date.now(), name: activityName, baseCurrency, people,
          items: [], dateCreated: new Date().toISOString()
        };
        activities.push(activity);
        saveActivities(activities);
        showSuccessMessage('Activity created!');
        setTimeout(() => window.location.href = `items.html?activity=${activity.id}`, 1200);
      }
    } catch (err) {
      showError('Failed to save. Please try again.');
    }
  });

  displayActivities();

  document.querySelectorAll('.close-modal').forEach(btn =>
    btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none')
  );
  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; })
  );
});

function displayActivities() {
  const container  = document.getElementById('activities-container');
  const activities = getActivities();
  if (activities.length === 0) {
    container.innerHTML = `<div class="no-activities"><div class="icon">🧾</div><p>No activities yet — create one above!</p></div>`;
    return;
  }
  const colors = ['#FF6B4A','#6C63FF','#22C55E','#F59E0B','#0EA5E9','#EC4899'];
  container.innerHTML = `<div class="activities-grid">${
    activities.map((a, i) => {
      const color = colors[i % colors.length];
      const date  = new Date(a.dateCreated).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const total = (a.items||[]).reduce((s, item) => s + item.cost, 0);
      const totalDisplay = formatCurrency(total, a.baseCurrency);
      return `
        <div class="activity-card">
          <div class="activity-card-name" style="color:${color}">${a.name}</div>
          <div class="activity-card-meta">
            <span>📅 ${date}</span>
            <span>👥 ${a.people.length} people · ${a.items?.length||0} items</span>
            ${total > 0 ? `<span style="font-weight:600;color:${color};">${totalDisplay} total</span>` : ''}
          </div>
          <div class="activity-card-actions">
            <button class="btn btn-ghost" onclick="window.editActivity(${a.id})" style="font-size:0.8rem;">✏️ Edit</button>
            <a href="items.html?activity=${a.id}" class="btn btn-secondary" style="font-size:0.8rem;">➕ Items</a>
            <a href="results.html?activity=${a.id}" class="btn btn-primary" style="font-size:0.8rem;">📊 Results</a>
            <button class="btn btn-danger" onclick="window.deleteActivity(${a.id})" style="font-size:0.8rem;">🗑</button>
          </div>
        </div>`;
    }).join('')
  }</div>`;
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-message';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

window.editActivity = function (id) {
  const activities = getActivities();
  const a = activities.find(x => x.id === id);
  if (!a) return;
  editingActivityId = id;
  document.getElementById('activity-name').value = a.name;
  document.getElementById('base-currency').value = a.baseCurrency;
  document.getElementById('num-people').value = a.people.length;
  document.getElementById('num-people').dispatchEvent(new Event('input'));
  setTimeout(() => {
    a.people.forEach((name, i) => {
      const el = document.getElementById(`person-${i}`);
      if (el) el.value = name;
    });
  }, 50);
  document.getElementById('save-btn').textContent = 'Update Activity →';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteActivity = function (id) {
  if (!confirm('Delete this activity and all its items?')) return;
  let activities = getActivities();
  activities = activities.filter(a => a.id !== id);
  saveActivities(activities);
  displayActivities();
};
