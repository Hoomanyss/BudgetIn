/* ===================================================
   dashboard.js — BudgetIn Shopping Dashboard Logic
   Handles item add/remove/edit, budget tracking,
   filtering, checklist, and real-time UI updates
   =================================================== */

'use strict';

// ── Element References ────────────────────────────────
const elTotalBudget    = document.getElementById('totalBudget');
const elTotalSpent     = document.getElementById('totalSpent');
const elTotalRemaining = document.getElementById('totalRemaining');
const elProgressFill   = document.getElementById('progressFill');
const elProgressPct    = document.getElementById('progressPercent');
const elProgressStatus = document.getElementById('progressStatus');
const elBudgetOverview = document.getElementById('budgetOverview');
const elItemList       = document.getElementById('itemList');
const elEmptyState     = document.getElementById('emptyState');
const elItemCount      = document.getElementById('itemCount');
const elCheckoutBar    = document.getElementById('checkoutBar');
const elCheckoutTotal  = document.getElementById('checkoutTotal');

const itemNameInput    = document.getElementById('itemName');
const itemPriceInput   = document.getElementById('itemPrice');
const itemPriorityInput= document.getElementById('itemPriority');
const itemQtyInput     = document.getElementById('itemQty');
const qtyMinus         = document.getElementById('qtyMinus');
const qtyPlus          = document.getElementById('qtyPlus');
const btnAddItem       = document.getElementById('btnAddItem');
const btnHistory       = document.getElementById('btnHistory');
const btnReset         = document.getElementById('btnReset');
const btnCheckout      = document.getElementById('btnCheckout');

// Session Switcher Elements
const elBtnSwitchSession     = document.getElementById('btnSwitchSession');
const elCurrentSessionName   = document.getElementById('currentSessionName');
const elSessionDropdown      = document.getElementById('sessionDropdown');
const elDropdownSessionList  = document.getElementById('dropdownSessionList');
const elBtnCreateNewSession  = document.getElementById('btnCreateNewSession');

// Modal elements
const editModal        = document.getElementById('editModal');
const editItemIdInput  = document.getElementById('editItemId');
const editPriceInput   = document.getElementById('editPriceInput');
const modalClose       = document.getElementById('modalClose');
const modalCancel      = document.getElementById('modalCancel');
const modalSave        = document.getElementById('modalSave');

// ── State ─────────────────────────────────────────────
let session     = null;
let activeFilter= 'all';

// ── Init ──────────────────────────────────────────────
function init() {
  session = getSession();

  if (!session || !session.budget) {
    navigate('index');
    return;
  }

  bindEvents();
  renderAll();
}

// ── Event Binding ─────────────────────────────────────
function bindEvents() {
  // Format price input
  itemPriceInput.addEventListener('input', () => formatInputAsRupiah(itemPriceInput));

  // Quantity controls
  qtyMinus.addEventListener('click', () => {
    const v = parseInt(itemQtyInput.value) || 1;
    itemQtyInput.value = Math.max(1, v - 1);
  });
  qtyPlus.addEventListener('click', () => {
    const v = parseInt(itemQtyInput.value) || 1;
    itemQtyInput.value = Math.min(99, v + 1);
  });

  // Add item
  btnAddItem.addEventListener('click', addItem);
  itemNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') itemPriceInput.focus();
  });
  itemPriceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });

  // Filter tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
      btn.classList.add('tab-btn--active');
      renderItemList();
    });
  });

  // Session selector events
  elBtnSwitchSession.addEventListener('click', toggleSessionDropdown);
  elBtnCreateNewSession.addEventListener('click', () => navigate('index?new=true'));
  document.addEventListener('click', (e) => {
    if (!elBtnSwitchSession.contains(e.target) && !elSessionDropdown.contains(e.target)) {
      closeSessionDropdown();
    }
  });

  // Navigation
  btnHistory.addEventListener('click', () => navigate('history'));
  btnReset.addEventListener('click', confirmReset);

  // Checkout
  btnCheckout.addEventListener('click', checkout);

  // Modal
  modalClose.addEventListener('click',  closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalSave.addEventListener('click',   saveEditedPrice);
  editPriceInput.addEventListener('input', () => formatInputAsRupiah(editPriceInput));
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });
}

// ── Add Item ──────────────────────────────────────────
function addItem() {
  const name     = itemNameInput.value.trim();
  const price    = parseRupiah(itemPriceInput.value);
  const priority = itemPriorityInput.value;
  const qty      = Math.max(1, parseInt(itemQtyInput.value) || 1);

  if (!name) {
    itemNameInput.focus();
    itemNameInput.style.borderColor = 'var(--clr-danger)';
    setTimeout(() => { itemNameInput.style.borderColor = ''; }, 1500);
    return;
  }

  const item = createItem(name, price, priority, qty);
  session.items.push(item);
  persistAndRender();

  // Reset form
  itemNameInput.value  = '';
  itemPriceInput.value = '';
  itemQtyInput.value   = '1';
  itemNameInput.focus();
}

// ── Toggle Checklist ──────────────────────────────────
function toggleCheck(id) {
  const item = session.items.find(i => i.id === id);
  if (!item) return;
  item.checked = !item.checked;
  persistAndRender();
}

// ── Delete Item ───────────────────────────────────────
function deleteItem(id) {
  session.items = session.items.filter(i => i.id !== id);
  persistAndRender();
}

// ── Edit Price Modal ──────────────────────────────────
function openEditModal(id) {
  const item = session.items.find(i => i.id === id);
  if (!item) return;
  editItemIdInput.value = id;
  const currentPrice = item.realPrice !== null ? item.realPrice : item.estimatedPrice;
  editPriceInput.value = currentPrice
    ? currentPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : '';
  editModal.style.display = 'flex';
  setTimeout(() => editPriceInput.focus(), 100);
}
function closeModal() {
  editModal.style.display = 'none';
  editPriceInput.value = '';
}
function saveEditedPrice() {
  const id    = parseInt(editItemIdInput.value);
  const price = parseRupiah(editPriceInput.value);
  const item  = session.items.find(i => i.id === id);
  if (!item) return;
  item.realPrice = price;
  persistAndRender();
  closeModal();
}

// ── Reset ─────────────────────────────────────────────
function confirmReset() {
  if (confirm('Reset sesi belanja saat ini? Data tidak bisa dikembalikan.')) {
    clearSession();
    navigate('index');
  }
}

// ── Checkout ──────────────────────────────────────────
function checkout() {
  const checkedCount = session.items.filter(i => i.checked).length;
  if (checkedCount === 0) {
    alert('Centang barang yang sudah kamu masukkan ke keranjang dulu!');
    return;
  }
  persistAndRender();
  navigate('settlement');
}

// ── Render ────────────────────────────────────────────
function renderAll() {
  elCurrentSessionName.textContent = session.name || 'Sesi Belanja';
  renderBudgetOverview();
  renderItemList();
  renderCheckoutBar();
}

function renderBudgetOverview() {
  const budget    = session.budget;
  const spent     = calcTotalSpent(session.items);
  const remaining = budget - spent;
  const status    = getBudgetStatus(spent, budget);
  const pct       = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  elTotalBudget.textContent    = formatRupiah(budget);
  elTotalSpent.textContent     = formatRupiah(spent);
  elTotalRemaining.textContent = formatRupiah(remaining);

  // Remaining color
  elTotalRemaining.className = 'overview-amount overview-amount--remaining' +
    (remaining < 0 ? ' danger' : '');

  // Progress bar
  elProgressFill.style.width = pct + '%';
  elProgressFill.className   = 'progress-fill' + (status === 'warn' ? ' warn' : status === 'danger' ? ' danger' : '');
  elProgressPct.textContent  = Math.round(pct) + '% terpakai';

  // Status badge
  elProgressStatus.textContent = statusLabel(status);
  elProgressStatus.className   = 'status-badge status--' + status;

  // Overview background
  elBudgetOverview.className = 'budget-overview' + (status !== 'safe' ? ' status-' + status : '');
}

function renderItemList() {
  const items   = session.items;
  const filtered = filterItems(items, activeFilter);

  elItemCount.textContent = items.length + (items.length === 1 ? ' barang' : ' barang');

  if (filtered.length === 0) {
    elEmptyState.style.display = '';
    // Update empty message by filter
    const p = elEmptyState.querySelector('p');
    if (items.length > 0 && activeFilter !== 'all') {
      p.textContent = 'Tidak ada barang di kategori ini.';
    } else {
      p.innerHTML = 'Daftar belanjamu masih kosong.<br/>Tambahkan barang pertamamu!';
    }
    // Clear existing cards
    [...elItemList.querySelectorAll('.item-card')].forEach(c => c.remove());
    return;
  }

  elEmptyState.style.display = 'none';

  // Diff rendering: remove old cards, add new
  [...elItemList.querySelectorAll('.item-card')].forEach(c => c.remove());

  filtered.forEach(item => {
    elItemList.appendChild(createItemCard(item));
  });
}

function filterItems(items, filter) {
  if (filter === 'all')      return items;
  if (filter === 'checked')  return items.filter(i => i.checked);
  if (filter === 'wajib')    return items.filter(i => i.priority === 'wajib');
  if (filter === 'keinginan')return items.filter(i => i.priority === 'keinginan');
  return items;
}

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card' + (item.checked ? ' checked' : '');
  card.dataset.id = item.id;

  const price = effectivePrice(item);
  const hasRealPrice = item.realPrice !== null;
  const unitPrice = hasRealPrice ? item.realPrice : item.estimatedPrice;
  const metaText = `${item.qty > 1 ? item.qty + ' × ' + formatRupiah(unitPrice) : formatRupiah(unitPrice)}${hasRealPrice ? ' (harga riil)' : ' (estimasi)'}`;

  card.innerHTML = `
    <button class="item-checkbox ${item.checked ? 'checked-box' : ''}" data-action="check" data-id="${item.id}">
      ${item.checked ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>` : ''}
    </button>
    <div class="item-body">
      <div class="item-name-row">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="priority-badge priority-badge--${item.priority}">
          ${item.priority === 'wajib' ? '⚡ Wajib' : '✨ Keinginan'}
        </span>
      </div>
      <div class="item-meta">${metaText}</div>
    </div>
    <div class="item-right">
      <div class="item-price">${formatRupiah(price)}</div>
      <div class="item-actions">
        <button class="item-action-btn item-action-btn--edit" data-action="edit" data-id="${item.id}" title="Ubah harga riil">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 9L9 1l2 2L3 11H1V9z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="item-action-btn item-action-btn--delete" data-action="delete" data-id="${item.id}" title="Hapus">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 3h10M4 3V2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M9.5 3l-.6 7a.5.5 0 0 1-.5.5H3.6a.5.5 0 0 1-.5-.5L2.5 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Delegate click events within card
  card.addEventListener('click', (e) => {
    const btn    = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = parseInt(btn.dataset.id);
    if (action === 'check')  toggleCheck(id);
    if (action === 'edit')   openEditModal(id);
    if (action === 'delete') deleteItem(id);
  });

  return card;
}

function renderCheckoutBar() {
  const checkedItems = session.items.filter(i => i.checked);
  if (checkedItems.length === 0) {
    elCheckoutBar.style.display = 'none';
    return;
  }
  elCheckoutBar.style.display = 'flex';
  elCheckoutTotal.textContent = formatRupiah(calcCheckedTotal(session.items));
}

// ── Persist + Re-render ───────────────────────────────
function persistAndRender() {
  saveSession(session);
  renderAll();
}

// ── Session Switcher Logics ───────────────────────────
function toggleSessionDropdown(e) {
  e.stopPropagation();
  const isHidden = elSessionDropdown.style.display === 'none';
  if (isHidden) {
    renderSessionDropdown();
    elSessionDropdown.style.display = 'flex';
    elBtnSwitchSession.classList.add('active');
  } else {
    closeSessionDropdown();
  }
}

function closeSessionDropdown() {
  elSessionDropdown.style.display = 'none';
  elBtnSwitchSession.classList.remove('active');
}

function renderSessionDropdown() {
  const sessions = getActiveSessions();
  const currentId = getCurrentSessionId();
  elDropdownSessionList.innerHTML = '';

  sessions.forEach(s => {
    const item = document.createElement('button');
    item.className = 'dropdown-item' + (s.id === currentId ? ' active' : '');
    
    const spent = calcTotalSpent(s.items);
    const metaText = `${formatRupiah(spent)} / ${formatRupiah(s.budget)}`;

    item.innerHTML = `
      <div class="dropdown-item-left">
        <div class="dropdown-item-name">${escapeHtml(s.name)}</div>
        <div class="dropdown-item-meta">${metaText}</div>
      </div>
      <div class="dropdown-item-dot"></div>
    `;

    item.addEventListener('click', () => {
      if (s.id !== currentId) {
        setCurrentSessionId(s.id);
        window.location.reload();
      }
      closeSessionDropdown();
    });

    elDropdownSessionList.appendChild(item);
  });
}

// ── Helpers ───────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Run ───────────────────────────────────────────────
init();
