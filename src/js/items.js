import { convertCurrency, formatCurrency, showSuccessMessage, populateCurrencySelect } from './utils.js';
import { initApp, getPrefs, getFriends, getActivities, saveActivities } from './appCore.js';

let currentActivity = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const urlParams = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('activity');
  if (!activityId) { window.location.href = 'setup.html'; return; }

  const loaderWrapper = document.getElementById('loader-wrapper');
  const startTime = Date.now();
  window.addEventListener('load', () => {
    const remaining = Math.max(0, 1200 - (Date.now() - startTime));
    setTimeout(() => loaderWrapper?.classList.add('loader-hidden'), remaining);
  });

  const activities = getActivities();
  currentActivity = activities.find(a => a.id === parseInt(activityId));
  if (!currentActivity) { window.location.href = 'setup.html'; return; }

  document.getElementById('page-title').textContent = currentActivity.name;
  document.getElementById('footer-activity-name').textContent = currentActivity.name;
  updateFooter();

  document.getElementById('next-to-results').addEventListener('click', () => {
    window.location.href = `results.html?activity=${activityId}`;
  });

  initializeForm();

  document.getElementById('split-type').addEventListener('change', () => {
    const isCustom = document.getElementById('split-type').value === 'custom';
    document.getElementById('custom-ratio-container').style.display = isCustom ? 'block' : 'none';
    if (isCustom) initializeCustomRatios(getSelectedParticipants());
  });

  const costInput  = document.getElementById('item-cost');
  const currSelect = document.getElementById('item-currency');
  costInput.addEventListener('input', updateConversionPreview);
  currSelect.addEventListener('change', updateConversionPreview);

  document.getElementById('payment-status').addEventListener('change', () => {
    const paid = document.getElementById('payment-status').value === 'paid';
    document.getElementById('buyer-section').style.display = paid ? 'block' : 'none';
    document.getElementById('item-buyer').required = paid;
    if (!paid) document.getElementById('item-buyer').value = '';
  });

  document.getElementById('select-everyone').addEventListener('click', () => {
    document.querySelectorAll('.participant-chip').forEach(c => setChip(c, true));
    if (document.getElementById('split-type').value === 'custom') initializeCustomRatios(getSelectedParticipants());
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    document.querySelectorAll('.participant-chip').forEach(c => setChip(c, false));
    if (document.getElementById('split-type').value === 'custom') initializeCustomRatios(getSelectedParticipants());
  });

  document.getElementById('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const prefs = getPrefs();
    const newItem = {
      id: Date.now(),
      name: document.getElementById('item-name').value.trim(),
      cost: parseFloat(document.getElementById('item-cost').value),
      currency: currSelect.value,
      paymentStatus: document.getElementById('payment-status').value,
      buyer: document.getElementById('payment-status').value === 'paid' ? document.getElementById('item-buyer').value : null,
      splitType: document.getElementById('split-type').value,
      participants: getSelectedParticipants(),
      customRatios: document.getElementById('split-type').value === 'custom' ? getCustomRatios() : null,
      timestamp: new Date().toISOString()
    };

    if (!validateItem(newItem)) return;

    currentActivity.items = currentActivity.items || [];
    currentActivity.items.push(newItem);
    saveActivity();

    document.getElementById('item-form').reset();
    currSelect.value = currentActivity.baseCurrency;
    document.getElementById('buyer-section').style.display = 'none';
    document.getElementById('custom-ratio-container').style.display = 'none';
    document.getElementById('conversion-preview').innerHTML = '';
    if (prefs.autoSelectAll !== false) {
      document.querySelectorAll('.participant-chip').forEach(c => setChip(c, true));
    }

    showSuccessMessage('Expense added!');
    displayItems();
    updateFooter();
  });

  document.querySelectorAll('.close-modal').forEach(btn =>
    btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none')
  );
  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; })
  );

  displayItems();
});

function initializeForm() {
  const currencySelect = document.getElementById('item-currency');
  populateCurrencySelect(currencySelect);
  currencySelect.value = currentActivity.baseCurrency;

  const buyerSelect = document.getElementById('item-buyer');
  buyerSelect.innerHTML = `<option value="">Select person…</option>` +
    currentActivity.people.map(p => `<option value="${p}">${p}</option>`).join('');

  const chipsContainer = document.getElementById('specific-people');
  const prefs = getPrefs();
  const autoSelect = prefs.autoSelectAll !== false;

  chipsContainer.innerHTML = currentActivity.people.map(person => `
    <button type="button"
            class="chip ${autoSelect ? 'selected' : ''} participant-chip"
            data-person="${person}"
            data-selected="${autoSelect ? 'true' : 'false'}">
      <span class="chip-check">${autoSelect ? '✓' : ''}</span>
      ${person}
    </button>`
  ).join('');

  chipsContainer.querySelectorAll('.participant-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const isSelected = chip.dataset.selected === 'true';
      setChip(chip, !isSelected);
      if (document.getElementById('split-type').value === 'custom') {
        initializeCustomRatios(getSelectedParticipants());
      }
    });
  });
}

function setChip(chip, selected) {
  chip.classList.toggle('selected', selected);
  chip.dataset.selected = selected ? 'true' : 'false';
  const check = chip.querySelector('.chip-check');
  if (check) check.textContent = selected ? '✓' : '';
}

function updateConversionPreview() {
  const amount  = parseFloat(document.getElementById('item-cost').value) || 0;
  const from    = document.getElementById('item-currency').value;
  const to      = currentActivity.baseCurrency;
  const preview = document.getElementById('conversion-preview');
  if (!amount || from === to) { preview.innerHTML = ''; return; }
  const converted = convertCurrency(amount, from, to);
  preview.innerHTML = `≈ ${formatCurrency(converted, to)} in base currency`;
}

// Tracks which ratio inputs the user has manually edited — these are "locked"
// and won't be touched by auto-balance when another input changes.
const lockedRatioInputs = new Set();

function initializeCustomRatios(people) {
  const container = document.getElementById('ratio-inputs');
  // Reset locks whenever the participant list changes
  lockedRatioInputs.clear();

  if (people.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem;">Select participants first.</p>';
    updateRatioBar();
    return;
  }

  const equalShare = Math.floor(100 / people.length);
  const remainder  = 100 - (equalShare * people.length);

  container.innerHTML = people.map((person, i) => `
    <div class="ratio-row" id="ratio-row-${i}">
      <label>${person}</label>
      <input type="number" id="ratio-${person.replace(/\s+/g,'-')}" name="${person}"
             min="0" max="100" step="1" value="${equalShare + (i === 0 ? remainder : 0)}">
      <span class="pct">%</span>
      <span class="ratio-lock" id="lock-${i}" title="Click to unlock and allow auto-balance"
            style="display:none;cursor:pointer;font-size:0.8rem;opacity:0.5;margin-left:4px;user-select:none;">🔒</span>
    </div>`).join('');

  container.querySelectorAll('input').forEach((inp, i) => {
    inp.addEventListener('input', () => autoBalance(inp, i));
  });

  updateRatioBar();
}

/**
 * When the user edits one input:
 *  1. Mark it as locked (won't be touched by future auto-balances).
 *  2. Distribute the remaining % among UNLOCKED inputs only.
 *  3. If all others are locked, just update the bar and warn — don't move anything.
 */
function autoBalance(changedInput, changedIdx) {
  const allInputs = Array.from(document.querySelectorAll('#ratio-inputs input'));

  // Clamp the changed value
  const changedVal = Math.min(100, Math.max(0, parseFloat(changedInput.value) || 0));
  changedInput.value = changedVal;

  // Lock this input and show the lock icon
  lockedRatioInputs.add(changedInput.name);
  const lockEl = document.getElementById(`lock-${changedIdx}`);
  if (lockEl) {
    lockEl.style.display = 'inline';
    lockEl.onclick = () => {
      lockedRatioInputs.delete(changedInput.name);
      lockEl.style.display = 'none';
    };
  }

  // Inputs that are free to be adjusted
  const freeInputs = allInputs.filter(i => !lockedRatioInputs.has(i.name) && i !== changedInput);

  if (freeInputs.length === 0) {
    // Nothing to redistribute — just show the bar (may go over/under 100)
    updateRatioBar();
    return;
  }

  // How much is left after all locked inputs + the changed input
  const lockedSum = allInputs
    .filter(i => lockedRatioInputs.has(i.name))
    .reduce((s, i) => s + (parseFloat(i.value) || 0), 0);

  const remaining = Math.max(0, 100 - lockedSum);
  const freeSum   = freeInputs.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);

  if (freeSum === 0) {
    // Distribute remaining evenly across free inputs
    const share = remaining / freeInputs.length;
    freeInputs.forEach(i => { i.value = +share.toFixed(1); });
  } else {
    // Distribute proportionally to free inputs' current weights
    freeInputs.forEach(i => {
      const w = (parseFloat(i.value) || 0) / freeSum;
      i.value = +(w * remaining).toFixed(1);
    });
  }

  // Fix floating-point rounding: apply any tiny remainder to the first free input
  const newSum = allInputs.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const diff   = 100 - newSum;
  if (Math.abs(diff) > 0.001) {
    freeInputs[0].value = +(parseFloat(freeInputs[0].value) + diff).toFixed(1);
  }

  updateRatioBar();
}

function updateRatioBar() {
  const inputs = document.querySelectorAll('#ratio-inputs input');
  const sum    = Array.from(inputs).reduce((t, i) => t + (parseFloat(i.value) || 0), 0);
  const fill   = document.getElementById('ratio-fill');
  const sumEl  = document.getElementById('ratio-sum');
  const warn   = document.getElementById('ratio-warning');
  if (sumEl) sumEl.textContent = sum.toFixed(0);
  if (fill)  { fill.style.width = Math.min(sum, 100) + '%'; fill.classList.toggle('over', sum > 100); }
  if (warn)  warn.style.display = Math.abs(sum - 100) > 0.5 ? 'block' : 'none';
}

function getSelectedParticipants() {
  return Array.from(document.querySelectorAll('.participant-chip'))
    .filter(c => c.dataset.selected === 'true')
    .map(c => c.dataset.person);
}

function getCustomRatios() {
  const ratios = {};
  document.querySelectorAll('#ratio-inputs input').forEach(inp => { ratios[inp.name] = parseFloat(inp.value) || 0; });
  return ratios;
}

function validateItem(item) {
  if (!item.name)                { showError('Please enter an item name'); return false; }
  if (!item.cost||item.cost<=0)  { showError('Please enter a valid cost'); return false; }
  if (!item.currency)            { showError('Please select a currency'); return false; }
  if (!item.paymentStatus)       { showError('Please choose a payment status'); return false; }
  if (item.paymentStatus==='paid'&&!item.buyer) { showError('Please select who paid'); return false; }
  if (item.participants.length===0) { showError('Select at least one participant'); return false; }
  if (item.splitType==='custom') {
    const sum = Object.values(item.customRatios).reduce((a,b)=>a+b,0);
    if (Math.abs(sum-100)>0.5) { showError('Custom percentages must total 100%'); return false; }
  }
  return true;
}

function saveActivity() {
  const activities = getActivities();
  const idx = activities.findIndex(a => a.id === currentActivity.id);
  if (idx !== -1) activities[idx] = currentActivity;
  saveActivities(activities);
}

function displayItems() {
  const container = document.getElementById('item-entries');
  const countEl   = document.getElementById('item-count');
  const items     = currentActivity.items || [];
  const prefs     = getPrefs();
  if (countEl) countEl.textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🧾</div><p>No expenses yet — add your first one above!</p></div>`;
    return;
  }

  const emojis = ['🍽️','🚕','🏨','☕','🛍️','🎟️','🍺','⛽','✈️','🎉'];
  const compact = prefs.compact;

  container.innerHTML = items.map((item, i) => `
    <div class="item-entry fade-in${compact ? ' item-entry-compact' : ''}">
      <div class="item-entry-icon">${emojis[i % emojis.length]}</div>
      <div class="item-entry-body">
        <div class="item-entry-name">${item.name}</div>
        <div class="item-entry-meta">
          ${item.paymentStatus==='pending'
            ? '<span class="badge badge-pending">⏳ Pending</span>'
            : `<span class="badge badge-paid">✓ Paid by ${item.buyer}</span>`}
          · ${item.participants.join(', ')}
        </div>
      </div>
      <div class="item-entry-cost">${formatCurrency(item.cost, item.currency)}</div>
      <div class="item-entry-actions">
        <button onclick="window.deleteItem(${item.id})" class="btn btn-danger btn-icon" title="Delete">🗑</button>
      </div>
    </div>`).join('');
}

function updateFooter() {
  const count = currentActivity?.items?.length || 0;
  const el = document.getElementById('footer-item-count');
  if (el) el.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-message';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

window.deleteItem = function (itemId) {
  if (!confirm('Remove this expense?')) return;
  currentActivity.items = currentActivity.items.filter(i => i.id !== itemId);
  saveActivity();
  showSuccessMessage('Item removed');
  displayItems();
  updateFooter();
};
