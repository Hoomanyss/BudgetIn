/* ===================================================
   history.js — BudgetIn History Page Logic
   =================================================== */

'use strict';

let currentDrawerSession = null;

function init() {
  renderHistory();

  document.getElementById('btnBack').addEventListener('click', () => navigate('dashboard'));
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (confirm('Hapus semua riwayat belanja?')) {
      clearHistory();
      renderHistory();
    }
  });
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('drawerOverlay')) closeDrawer();
  });
  document.getElementById('btnDeleteSession').addEventListener('click', () => {
    if (!currentDrawerSession) return;
    deleteHistoryItem(currentDrawerSession.id);
    closeDrawer();
    renderHistory();
  });
  document.getElementById('btnGoShop').addEventListener('click', () => navigate('index'));
}

function renderHistory() {
  const history = getHistory();
  const list    = document.getElementById('sessionList');
  list.innerHTML = '';

  if (history.length === 0) {
    document.getElementById('emptyHistory').style.display = '';
    document.getElementById('historyStats').style.display = 'none';
    return;
  }

  document.getElementById('emptyHistory').style.display = 'none';
  document.getElementById('historyStats').style.display = '';

  // Stats
  const totalSpent  = history.reduce((s, h) => s + h.spent, 0);
  const totalSaving = history.reduce((s, h) => s + (h.saving > 0 ? h.saving : 0), 0);
  document.getElementById('totalSessions').textContent  = history.length;
  document.getElementById('totalAllSpent').textContent  = formatRupiah(totalSpent);
  document.getElementById('totalAllSaving').textContent = formatRupiah(totalSaving);

  history.forEach((s, idx) => {
    const card = makeSessionCard(s, idx);
    list.appendChild(card);
  });
}

function makeSessionCard(s, idx) {
  const over  = s.spent > s.budget;
  const pct   = s.budget > 0 ? Math.min((s.spent / s.budget) * 100, 100) : 0;
  const div   = document.createElement('div');
  div.className = `session-card session--${over ? 'over' : 'safe'}`;
  div.style.animationDelay = (idx * 0.05) + 's';
  div.innerHTML = `
    <div class="session-header">
      <span class="session-date">${formatDate(s.completedAt || s.createdAt)}</span>
      <span class="session-badge session-badge--${over ? 'over' : 'safe'}">${over ? 'Over Budget' : 'Hemat'}</span>
    </div>
    <div class="session-amounts">
      <div class="sa-spent">${formatRupiah(s.spent)}</div>
      <div class="sa-of">dari ${formatRupiah(s.budget)}</div>
    </div>
    <div class="session-progress">
      <div class="session-progress-fill ${over ? 'over' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="session-footer">
      <span class="session-items-count">${(s.items||[]).length} barang</span>
      <span class="session-saving ${over ? 'over' : ''}">
        ${over ? '−' : '+'}${formatRupiah(Math.abs(s.saving))}
      </span>
    </div>
  `;
  div.addEventListener('click', () => openDrawer(s));
  return div;
}

function openDrawer(s) {
  currentDrawerSession = s;
  document.getElementById('drawerTitle').textContent = formatDate(s.completedAt || s.createdAt);

  const content = document.getElementById('drawerContent');
  content.innerHTML = '';

  const rows = [
    ['Budget Awal', formatRupiah(s.budget)],
    ['Total Dibelanjakan', formatRupiah(s.spent)],
    [s.saving >= 0 ? 'Penghematan' : 'Kelebihan', formatRupiah(Math.abs(s.saving))],
  ];
  rows.forEach(([label, val]) => {
    const el = document.createElement('div');
    el.className = 'drawer-item';
    el.innerHTML = `<span>${label}</span><span>${val}</span>`;
    content.appendChild(el);
  });

  // Items
  if (s.items && s.items.length) {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:.75rem;font-weight:600;color:var(--clr-text-3);text-transform:uppercase;letter-spacing:.06em;padding:8px 0 4px';
    title.textContent = 'Daftar Barang';
    content.appendChild(title);

    s.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'drawer-item';
      el.style.opacity = item.checked ? '1' : '0.45';
      el.innerHTML = `
        <span>${item.checked ? '✓' : '○'} ${item.name}</span>
        <span>${formatRupiah(effectivePrice(item))}</span>
      `;
      content.appendChild(el);
    });
  }

  document.getElementById('drawerOverlay').style.display = '';
}

function closeDrawer() {
  document.getElementById('drawerOverlay').style.display = 'none';
  currentDrawerSession = null;
}

init();
