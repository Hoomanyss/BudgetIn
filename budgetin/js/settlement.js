/* ===================================================
   settlement.js — BudgetIn Settlement Logic
   =================================================== */

'use strict';

function init() {
  const session = getSession();
  if (!session) { navigate('index'); return; }

  const budget  = session.budget;
  const items   = session.items;
  const checked = items.filter(i => i.checked);
  const skipped = items.filter(i => !i.checked);
  const spent   = checked.reduce((s, i) => s + effectivePrice(i), 0);
  const saving  = budget - spent;
  const over    = spent > budget;

  // Hero
  const hero = document.getElementById('resultHero');
  document.getElementById('resultEmoji').textContent = over ? '😬' : saving > 0 ? '🎉' : '✅';
  document.getElementById('resultTitle').textContent = over ? 'Melebihi Budget!' : 'Belanja Selesai!';
  document.getElementById('resultSub').textContent   = over
    ? `Kamu melebihi budget sebesar ${formatRupiah(Math.abs(saving))}.`
    : saving > 0
      ? `Kamu berhasil hemat ${formatRupiah(saving)} dari budget awal.`
      : 'Kamu tepat menggunakan seluruh budget. Pas!';
  if (over) hero.classList.add('overbudget');

  // Summary cards
  document.getElementById('sc-budget').textContent       = formatRupiah(budget);
  document.getElementById('sc-spent').textContent        = formatRupiah(spent);
  document.getElementById('sc-saving').textContent       = formatRupiah(Math.abs(saving));
  document.getElementById('sc-saving-label').textContent = over ? 'Kelebihan' : 'Penghematan';

  // Breakdown list
  const bList = document.getElementById('breakdownList');
  document.getElementById('boughtCount').textContent = checked.length + ' item';
  checked.forEach(item => {
    bList.appendChild(makeRow(item));
  });

  // Skipped
  if (skipped.length > 0) {
    document.getElementById('skippedSection').style.display = '';
    document.getElementById('skippedCount').textContent = skipped.length + ' item';
    const sList = document.getElementById('skippedList');
    skipped.forEach(item => {
      const row = makeRow(item);
      row.classList.add('breakdown-item--skipped');
      sList.appendChild(row);
    });
  }

  // Buttons
  document.getElementById('btnSaveHistory').addEventListener('click', () => {
    const record = {
      budget, spent,
      saving: over ? -Math.abs(saving) : saving,
      items: items,
      createdAt: session.createdAt,
      completedAt: nowISO(),
    };
    appendHistory(record);
    showToast('✓ Riwayat berhasil disimpan!');
    document.getElementById('btnSaveHistory').disabled = true;
    document.getElementById('btnSaveHistory').textContent = 'Tersimpan ✓';
  });

  document.getElementById('btnNewSession').addEventListener('click', () => {
    clearSession();
    navigate('index');
  });
}

function makeRow(item) {
  const div = document.createElement('div');
  div.className = 'breakdown-item';
  div.innerHTML = `
    <div class="bi-left">
      <span class="bi-name">${item.name}</span>
      <div class="bi-meta">
        <span class="bi-qty">${item.qty > 1 ? item.qty + '×' : ''}</span>
        <span class="priority-badge priority-badge--${item.priority}">
          ${item.priority === 'wajib' ? '⚡ Wajib' : '✨ Keinginan'}
        </span>
      </div>
    </div>
    <div class="bi-right">${formatRupiah(effectivePrice(item))}</div>
  `;
  return div;
}

init();
