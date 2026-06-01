/* ===================================================
   onboarding.js — BudgetIn Onboarding Logic
   Handles budget input, validation, and session start
   =================================================== */

'use strict';

// ── Element References ────────────────────────────────
const budgetInput  = document.getElementById('budgetInput');
const btnStart     = document.getElementById('btnStart');
const inputHint    = document.getElementById('inputHint');
const qaButtons    = document.querySelectorAll('.qa-btn');
const sessionName  = document.getElementById('sessionName');
const btnCancel    = document.getElementById('btnCancel');

// ── State ─────────────────────────────────────────────
let selectedBudget = 0;
let isForcedNew    = false;

// ── Init ──────────────────────────────────────────────
function init() {
  const urlParams = new URLSearchParams(window.location.search);
  isForcedNew = urlParams.get('new') === 'true';

  const session = getSession();
  
  // If there's an active session already and we're not forcing a new one, redirect to dashboard
  if (session && session.budget > 0 && !isForcedNew) {
    navigate('dashboard');
    return;
  }

  // Show cancel button if we have existing sessions and are forcing a new one
  if (isForcedNew && session) {
    btnCancel.style.display = 'flex';
  }

  bindEvents();
}

// ── Event Binding ─────────────────────────────────────
function bindEvents() {
  // Format as user types
  budgetInput.addEventListener('input', onBudgetInput);
  budgetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnStart.disabled) startShopping();
  });

  // Quick amount buttons
  qaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      setQuickAmount(amount, btn);
    });
  });

  // Start button
  btnStart.addEventListener('click', startShopping);

  // Cancel button
  btnCancel.addEventListener('click', () => {
    navigate('dashboard');
  });
}

// ── Budget Input Handler ──────────────────────────────
function onBudgetInput() {
  // Clear active quick-select
  qaButtons.forEach(b => b.classList.remove('active'));

  formatInputAsRupiah(budgetInput);
  const value = parseRupiah(budgetInput.value);
  selectedBudget = value;
  validateBudget(value);
}

// ── Quick Amount ──────────────────────────────────────
function setQuickAmount(amount, activeBtn) {
  selectedBudget = amount;
  budgetInput.value = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Toggle active state
  qaButtons.forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');

  validateBudget(amount);
  budgetInput.focus();
}

// ── Validation ────────────────────────────────────────
function validateBudget(value) {
  if (!value || value <= 0) {
    setHint('Masukkan nominalmu lalu klik mulai belanja', '');
    btnStart.disabled = true;
    return false;
  }

  if (value < 1000) {
    setHint('Budget minimal Rp 1.000', 'error');
    btnStart.disabled = true;
    return false;
  }

  if (value > 100_000_000) {
    setHint('Budget maksimal Rp 100.000.000', 'error');
    btnStart.disabled = true;
    return false;
  }

  setHint(`Budget: ${formatRupiah(value)} siap digunakan 🛍️`, 'valid');
  btnStart.disabled = false;
  return true;
}

// ── Set Hint ──────────────────────────────────────────
function setHint(msg, type) {
  inputHint.textContent = msg;
  inputHint.className = 'input-hint' + (type ? ' ' + type : '');
}

// ── Start Shopping ─────────────────────────────────────
function startShopping() {
  if (!validateBudget(selectedBudget)) return;

  // Animate button
  btnStart.innerHTML = `<span>Menyiapkan...</span>`;
  btnStart.disabled = true;

  // Extract name (fallback to generated default in saveSession)
  const nameVal = sessionName.value.trim();

  // Create and save new session
  const session = createSession(selectedBudget, nameVal);
  saveSession(session);

  // Short delay for UX feel, then navigate
  setTimeout(() => navigate('dashboard'), 400);
}

// ── Run ───────────────────────────────────────────────
init();
