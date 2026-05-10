import { convertCurrency, formatCurrency, showSuccessMessage, currencies } from './utils.js';
import { initApp, getPaymentMethods, getPrefs } from './appCore.js';

let currentActivity = null;
let liveRates = null;

const AVATAR_COLORS = ['#FF6B4A','#6C63FF','#22C55E','#F59E0B','#0EA5E9','#EC4899','#14B8A6','#8B5CF6'];
const SYMBOL_TO_CODE = {'$':'USD','€':'EUR','£':'GBP','¥':'JPY','₹':'INR','A$':'AUD','C$':'CAD','CHF':'CHF','元':'CNY','₩':'KRW','kr':'SEK','₪':'ILS','S$':'SGD','฿':'THB','R$':'BRL','₱':'PHP','zł':'PLN','RM':'MYR','﷼':'SAR','HK$':'HKD','₺':'TRY'};
const CODE_TO_SYMBOL = Object.fromEntries(Object.entries(SYMBOL_TO_CODE).map(([s,c])=>[c,s]));

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const urlParams  = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('activity');
  if (!activityId) { window.location.href = 'setup.html'; return; }

  const activities  = JSON.parse(localStorage.getItem('activities')) || [];
  currentActivity   = activities.find(a => a.id === Number(activityId));
  if (!currentActivity) { window.location.href = 'setup.html'; return; }

  document.getElementById('activity-name').textContent = currentActivity.name;

  // Fetch live rates then render
  showRateStatus('loading');
  fetchLiveRates().then(() => {
    showRateStatus(liveRates ? 'live' : 'fallback');
    calculateAndDisplayResults();
    renderPayDirect();
  });

  initializeUI();
});

async function fetchLiveRates() {
  try {
    const baseCode = SYMBOL_TO_CODE[currentActivity.baseCurrency] || 'USD';
    const res = await fetch(`https://api.frankfurter.app/latest?base=${baseCode}`);
    if (!res.ok) return;
    const data = await res.json();
    liveRates = data.rates;
    liveRates[baseCode] = 1;
    // Patch conversionRates used by convertCurrency
    window.__liveRates = liveRates;
    window.__liveBaseCode = baseCode;
  } catch {
    liveRates = null;
  }
}

function convertAmt(amount, fromSym, toSym) {
  if (fromSym === toSym) return amount;
  if (liveRates) {
    const fromCode = SYMBOL_TO_CODE[fromSym] || 'USD';
    const toCode   = SYMBOL_TO_CODE[toSym]   || 'USD';
    const baseCode = window.__liveBaseCode || 'USD';
    // Convert: from -> base -> to
    const toBase = fromCode === baseCode ? amount : amount / (liveRates[fromCode] || 1);
    return toBase * (liveRates[toCode] || 1);
  }
  return convertCurrency(amount, fromSym, toSym);
}

function showRateStatus(state) {
  const btn = document.getElementById('toggle-rates');
  if (!btn) return;
  const labels = { loading: '⏳ Loading rates…', live: '🌐 Live rates', fallback: '📊 Rates (offline)' };
  btn.textContent = labels[state] || '💱 Exchange rates';
  btn.disabled = state === 'loading';
}

function initializeUI() {
  document.getElementById('toggle-rates').addEventListener('click', function () {
    const div    = document.getElementById('conversion-rate');
    const hidden = div.style.display === 'none' || !div.style.display;
    div.style.display = hidden ? 'block' : 'none';
    this.textContent = hidden ? (liveRates ? '🌐 Hide rates' : '📊 Hide rates') : (liveRates ? '🌐 Live rates' : '📊 Rates (offline)');
    if (hidden) renderExchangeRates();
  });

  document.getElementById('share-button').addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'flex';
  });
  document.getElementById('download-pdf').addEventListener('click', generatePDF);
  document.getElementById('back-to-items').addEventListener('click', () => {
    window.location.href = `items.html?activity=${currentActivity.id}`;
  });
  document.getElementById('new-activity-btn').addEventListener('click', () => {
    window.location.href = 'setup.html';
  });
  document.getElementById('copy-link')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => showSuccessMessage('Link copied!'));
  });
  document.getElementById('share-whatsapp')?.addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText())}`, '_blank');
  });
  document.getElementById('share-email')?.addEventListener('click', () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('Results: ' + currentActivity.name)}&body=${encodeURIComponent(generateShareText())}`;
  });
  document.querySelectorAll('.close-modal').forEach(btn =>
    btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none')
  );
  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; })
  );
}

function calculateAndDisplayResults() {
  const { personalTotals, payments } = calculateTotals();
  const simplified = simplifyDebts(payments, personalTotals);
  displayResults(personalTotals, simplified);
}

function calculateTotals() {
  const personalTotals = {};
  const payments = {};
  currentActivity.people.forEach(p => {
    personalTotals[p] = 0;
    payments[p] = {};
    currentActivity.people.forEach(o => { if (p !== o) payments[p][o] = 0; });
  });

  (currentActivity.items || []).forEach(item => {
    const n = item.participants.length;
    if (item.splitType === 'custom') {
      item.participants.forEach(p => {
        const share = convertAmt(item.cost * (item.customRatios[p] / 100), item.currency, currentActivity.baseCurrency);
        personalTotals[p] += share;
      });
    } else {
      const sharePerPerson = item.cost / n;
      item.participants.forEach(p => {
        personalTotals[p] += convertAmt(sharePerPerson, item.currency, currentActivity.baseCurrency);
      });
    }
    if (item.paymentStatus === 'paid') {
      personalTotals[item.buyer] -= convertAmt(item.cost, item.currency, currentActivity.baseCurrency);
      item.participants.forEach(p => {
        if (p !== item.buyer) {
          const share = item.splitType === 'custom'
            ? item.cost * (item.customRatios[p] / 100)
            : item.cost / n;
          payments[p][item.buyer] += convertAmt(share, item.currency, currentActivity.baseCurrency);
        }
      });
    }
  });
  return { personalTotals, payments };
}

function simplifyDebts(payments, personalTotals) {
  const simplified = {};
  const round = n => Math.round(n * 100) / 100;
  const debtors   = Object.entries(personalTotals).filter(([,b])=>b>0.01).map(([p,b])=>({p,amt:b})).sort((a,b)=>b.amt-a.amt);
  const creditors = Object.entries(personalTotals).filter(([,b])=>b<-0.01).map(([p,b])=>({p,amt:-b})).sort((a,b)=>b.amt-a.amt);
  debtors.forEach(d => { simplified[d.p] = {}; });
  while (debtors.length && creditors.length) {
    const d = debtors[0], c = creditors[0];
    const amt = Math.min(d.amt, c.amt);
    if (amt > 0.01) simplified[d.p][c.p] = round(amt);
    d.amt = round(d.amt - amt); c.amt = round(c.amt - amt);
    if (d.amt <= 0.01) debtors.shift();
    if (c.amt <= 0.01) creditors.shift();
  }
  return simplified;
}

function displayResults(personalTotals, payments) {
  const prefs = getPrefs();
  const round = v => prefs.roundAmounts ? Math.round(v) : v;
  const fmt   = (v, sym) => formatCurrency(round(v), sym);

  const totalSpend = (currentActivity.items||[]).reduce((s,item)=>s+convertAmt(item.cost,item.currency,currentActivity.baseCurrency),0);
  const txnCount   = Object.values(payments).flatMap(p=>Object.values(p)).filter(v=>v>0.01).length;

  document.getElementById('results-summary').innerHTML = `
    <div class="summary-stat">
      <div class="stat-value">${fmt(totalSpend, currentActivity.baseCurrency)}</div>
      <div class="stat-label">Total spent</div>
    </div>
    <div class="summary-stat">
      <div class="stat-value">${currentActivity.people.length}</div>
      <div class="stat-label">People</div>
    </div>
    <div class="summary-stat">
      <div class="stat-value">${txnCount}</div>
      <div class="stat-label">Transfers needed</div>
    </div>`;

  document.getElementById('balance-list').innerHTML = currentActivity.people.map((person,i) => {
    const balance  = personalTotals[person];
    const color    = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const initials = person.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const abs      = Math.abs(balance);
    const isOwe    = balance > 0.01;
    const isGet    = balance < -0.01;
    return `
      <div class="balance-row">
        <div class="balance-avatar" style="background:${color}">${initials}</div>
        <div>
          <div class="balance-name">${person}</div>
          <div class="balance-detail">${isOwe?'Owes money':isGet?'Gets money back':'All settled'}</div>
        </div>
        <div class="balance-amount">
          <div class="amount ${isOwe?'amount-owe':isGet?'amount-receive':'amount-settled'}">
            ${isOwe?'−':isGet?'+':''}${fmt(abs,currentActivity.baseCurrency)}
          </div>
          <div style="font-size:0.72rem;color:var(--text-3);">${isOwe?'to pay':isGet?'to receive':'settled'}</div>
        </div>
      </div>`;
  }).join('');

  const instrEl   = document.getElementById('payment-instructions');
  const instrList = [];
  Object.entries(payments).forEach(([from,tos]) => {
    Object.entries(tos).forEach(([to,amount]) => {
      if (amount > 0.01) instrList.push({from,to,amount});
    });
  });

  instrEl.innerHTML = instrList.length === 0
    ? `<div class="empty-state"><div class="icon">✅</div><p>Everyone is settled up!</p></div>`
    : instrList.map(({from,to,amount}) => `
      <div class="payment-instruction">
        <span class="from">${from}</span>
        <span class="arrow">→</span>
        <span class="to">${to}</span>
        <span class="amount">${fmt(amount,currentActivity.baseCurrency)}</span>
      </div>`).join('');

  const emojis = ['🍽️','🚕','🏨','☕','🛍️','🎟️','🍺','⛽','✈️','🎉'];
  document.getElementById('item-list').innerHTML = (currentActivity.items||[]).map((item,i)=>`
    <div class="expense-card">
      <div>
        <div style="font-weight:700;margin-bottom:6px;font-size:0.95rem;">${emojis[i%emojis.length]} ${item.name}</div>
        <div style="font-size:0.85rem;color:var(--text-3);margin-bottom:4px;">
          ${item.paymentStatus==='pending'?'<span class="badge badge-pending">⏳ Pending</span>':`<span class="badge badge-paid">✓ Paid by ${item.buyer}</span>`}
        </div>
        <div style="font-size:0.8rem;color:var(--text-3);">
          ${item.splitType==='equal'?'⚖️ Equal':'✏️ Custom'} · ${item.participants.join(', ')}
        </div>
      </div>
      <div style="font-weight:700;font-size:1rem;color:var(--text);margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        ${fmt(item.cost,item.currency)}
      </div>
    </div>`).join('');
}

// ── Pay directly ─────────────────────────────────────────────
function renderPayDirect() {
  const paymentMethods = getPaymentMethods();
  if (paymentMethods.length === 0) return;

  const { personalTotals, payments } = calculateTotals();
  const simplified = simplifyDebts(payments, personalTotals);

  // Find instructions where the receiver has a saved payment method
  // Match by name to payment methods saved by the current user
  // (in a real app this would be server-side; here we show all saved methods as "yours")
  const instrList = [];
  Object.entries(simplified).forEach(([from, tos]) => {
    Object.entries(tos).forEach(([to, amount]) => {
      if (amount > 0.01) instrList.push({ from, to, amount });
    });
  });

  if (instrList.length === 0 || paymentMethods.length === 0) return;

  const defaultMethod = paymentMethods[0];
  const ICONS = { paypal:'🅿️', venmo:'💙', revolut:'🔵', wise:'🌍', bank:'🏦', cashapp:'$', other:'💰' };
  const LABELS = { paypal:'PayPal', venmo:'Venmo', revolut:'Revolut', wise:'Wise', bank:'Bank transfer', cashapp:'Cash App', other:'Other' };

  const section = document.getElementById('pay-direct-section');
  const list    = document.getElementById('pay-direct-list');

  section.style.display = 'block';
  document.getElementById('pay-direct-text').textContent =
    `Pay directly via ${defaultMethod.nickname || LABELS[defaultMethod.type]}:`;

  list.innerHTML = instrList.map(({ from, to, amount }) => `
    <div class="payment-instruction" style="flex-wrap:wrap;gap:8px;">
      <span class="from">${from}</span>
      <span class="arrow">→</span>
      <span class="to">${to}</span>
      <span class="amount">${formatCurrency(amount, currentActivity.baseCurrency)}</span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
        <span style="font-size:0.8rem;color:var(--text-3);">${ICONS[defaultMethod.type]} ${defaultMethod.detail}</span>
        <button class="btn btn-primary" style="font-size:0.78rem;padding:5px 12px;"
          onclick="copyPaymentHandle('${defaultMethod.detail}')">Copy handle</button>
      </div>
    </div>`).join('');
}

window.copyPaymentHandle = function(handle) {
  navigator.clipboard.writeText(handle).then(() => showSuccessMessage('Handle copied!'));
};

function renderExchangeRates() {
  const div = document.getElementById('conversion-rate');
  const baseSym = currentActivity.baseCurrency;
  if (liveRates) {
    const baseCode = SYMBOL_TO_CODE[baseSym] || 'USD';
    const lines = Object.entries(liveRates)
      .filter(([code]) => CODE_TO_SYMBOL[code] && code !== baseCode)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([code, rate]) => {
        const sym = CODE_TO_SYMBOL[code];
        return `<span>1 ${baseSym} = <strong>${rate.toFixed(4)}</strong> ${sym} <span style="color:var(--text-3);font-size:0.8em;">${code}</span></span>`;
      });
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:#22C55E;color:white;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:99px;">● LIVE</span>
        <span style="font-weight:600;">Exchange rates</span>
        <span style="color:var(--text-3);font-size:0.8rem;margin-left:auto;">Updated ${new Date().toLocaleTimeString()}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;font-size:0.85rem;line-height:2;">${lines.join('')}</div>`;
  } else {
    const lines = Object.entries(currencies).filter(([sym])=>sym!==baseSym)
      .map(([sym]) => `<span>1 ${baseSym} = <strong>${convertCurrency(1,baseSym,sym).toFixed(4)}</strong> ${sym}</span>`).sort();
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:var(--text-3);color:white;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:99px;">OFFLINE</span>
        <span style="font-weight:600;">Exchange rates</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;font-size:0.85rem;line-height:2;">${lines.join('')}</div>`;
  }
}

function generateShareText() {
  const { personalTotals } = calculateTotals();
  let text = `Results for ${currentActivity.name}\n\n`;
  Object.entries(personalTotals).forEach(([p,b]) => {
    const isOwe=b>0.01, isGet=b<-0.01;
    text += `${p}: ${formatCurrency(Math.abs(b),currentActivity.baseCurrency)} ${isOwe?'to pay':isGet?'to receive':'(settled)'}\n`;
  });
  return text;
}

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { personalTotals, payments } = calculateTotals();
  const simplified = simplifyDebts(payments, personalTotals);

  doc.setFontSize(22); doc.setTextColor(255,107,74);
  doc.text('$plitMyChe€ks', 105, 18, {align:'center'});
  doc.setFontSize(14); doc.setTextColor(50,50,50);
  doc.text(`Results: ${currentActivity.name}`, 105, 30, {align:'center'});
  doc.setFontSize(10); doc.setTextColor(150);
  doc.text(`Base currency: ${currentActivity.baseCurrency}  ·  ${new Date().toLocaleDateString()}`, 105, 38, {align:'center'});

  doc.autoTable({
    startY: 46,
    head: [['Person','Amount','Status']],
    body: Object.entries(personalTotals).map(([p,b])=>[
      p, formatCurrency(Math.abs(b),currentActivity.baseCurrency),
      b>0.01?'To pay':b<-0.01?'To receive':'Settled'
    ]),
    headStyles: { fillColor:[255,107,74] }, theme:'grid'
  });

  let y = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(13); doc.setTextColor(50);
  doc.text('Payment Instructions:', 20, y); y += 8;
  doc.setFontSize(11);
  Object.entries(simplified).forEach(([from,tos]) => {
    Object.entries(tos).forEach(([to,amount]) => {
      doc.text(`${from}  →  ${to}  ${formatCurrency(amount,currentActivity.baseCurrency)}`, 25, y);
      y += 7;
    });
  });

  doc.save(`${currentActivity.name.replace(/\s+/g,'_')}_results.pdf`);
  showSuccessMessage('PDF downloaded!');
}
