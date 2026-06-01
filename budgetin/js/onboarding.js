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

// ── State ─────────────────────────────────────────────
let selectedBudget = 0;

// ── Init ──────────────────────────────────────────────
function init() {
  // If there's an active session already, redirect to dashboard
  const session = getSession();
  if (session && session.budget > 0) {
    navigate('dashboard');
    return;
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

  // Create and save new session
  const session = createSession(selectedBudget);
  saveSession(session);

  // Short delay for UX feel, then navigate
  setTimeout(() => navigate('dashboard'), 400);
}

// ── Run ───────────────────────────────────────────────
init();
