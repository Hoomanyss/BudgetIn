/* ===================================================
   utils.js — BudgetIn Shared Utilities
   Helper functions used across all pages
   =================================================== */

'use strict';

// ── Number Formatting ─────────────────────────────────

/**
 * Format number as Rupiah string (Rp 100.000)
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  if (isNaN(amount) || amount === null) return 'Rp 0';
  return 'Rp ' + Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse a formatted Rupiah string or raw number string → number
 * Removes dots, commas, "Rp" prefix
 * @param {string} str
 * @returns {number}
 */
function parseRupiah(str) {
  if (typeof str === 'number') return str;
  const clean = String(str).replace(/[^0-9]/g, '');
  return parseInt(clean || '0', 10);
}

/**
 * Format input field value with thousands separator (dots) as user types
 * @param {HTMLInputElement} input
 */
function formatInputAsRupiah(input) {
  const cursor = input.selectionStart;
  const raw = input.value.replace(/[^0-9]/g, '');
  const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const prevLen = input.value.length;
  input.value = formatted;
  // Preserve cursor position roughly
  const diff = formatted.length - prevLen;
  input.setSelectionRange(cursor + diff, cursor + diff);
}

// ── Date Formatting ───────────────────────────────────

/**
 * Get current timestamp as ISO string
 * @returns {string}
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Format ISO date string to readable Indonesian date
 * @param {string} isoString
 * @returns {string} e.g. "Senin, 17 Jun 2024 · 14:30"
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = days[date.getDay()];
  const day = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2,'0');
  const min = String(date.getMinutes()).padStart(2,'0');
  return `${d}, ${day} ${m} ${y} · ${h}:${min}`;
}

// ── LocalStorage Helpers ──────────────────────────────

const LS_KEYS = {
  SESSION:          'budgetin_session',          // legacy active session
  HISTORY:          'budgetin_history',          // array of completed sessions
  ACTIVE_SESSIONS:  'budgetin_active_sessions',  // array of all active sessions
  CURRENT_ID:       'budgetin_current_id',       // ID of current active session
};

/**
 * Get all active sessions
 * @returns {Array}
 */
function getActiveSessions() {
  try {
    const raw = localStorage.getItem(LS_KEYS.ACTIVE_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Save all active sessions list
 * @param {Array} sessions
 */
function saveActiveSessions(sessions) {
  localStorage.setItem(LS_KEYS.ACTIVE_SESSIONS, JSON.stringify(sessions));
}

/**
 * Get current active session ID
 * @returns {number|null}
 */
function getCurrentSessionId() {
  const id = localStorage.getItem(LS_KEYS.CURRENT_ID);
  return id ? parseInt(id, 10) : null;
}

/**
 * Set current active session ID
 * @param {number} id
 */
function setCurrentSessionId(id) {
  localStorage.setItem(LS_KEYS.CURRENT_ID, id.toString());
}

/**
 * Get current active session from storage
 * @returns {Object|null}
 */
function getSession() {
  const sessions = getActiveSessions();
  
  // Backward compatibility: check if there's an old single session
  if (sessions.length === 0) {
    try {
      const legacyRaw = localStorage.getItem(LS_KEYS.SESSION);
      if (legacyRaw) {
        const legacySession = JSON.parse(legacyRaw);
        if (legacySession && legacySession.budget > 0) {
          legacySession.id = Date.now();
          legacySession.name = 'Sesi Belanja';
          const newSessions = [legacySession];
          saveActiveSessions(newSessions);
          setCurrentSessionId(legacySession.id);
          localStorage.removeItem(LS_KEYS.SESSION); // Clean legacy key
          return legacySession;
        }
      }
    } catch (e) { /* ignore */ }
  }

  if (sessions.length === 0) return null;

  const currentId = getCurrentSessionId();
  if (currentId) {
    const found = sessions.find(s => s.id === currentId);
    if (found) return found;
  }

  // Fallback: select first active session
  const fallback = sessions[0];
  setCurrentSessionId(fallback.id);
  return fallback;
}

/**
 * Save current active session to storage
 * @param {Object} session
 */
function saveSession(session) {
  if (!session) return;
  if (!session.id) {
    session.id = Date.now();
  }
  if (!session.name) {
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    session.name = `Belanja ${dateStr}`;
  }

  const sessions = getActiveSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index !== -1) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }

  saveActiveSessions(sessions);
  setCurrentSessionId(session.id);
}

/**
 * Clear the current active session
 */
function clearSession() {
  const currentId = getCurrentSessionId();
  if (!currentId) return;

  const sessions = getActiveSessions().filter(s => s.id !== currentId);
  saveActiveSessions(sessions);

  if (sessions.length > 0) {
    setCurrentSessionId(sessions[0].id);
  } else {
    localStorage.removeItem(LS_KEYS.CURRENT_ID);
  }
}

/**
 * Get all saved history sessions
 * @returns {Array}
 */
function getHistory() {
  try {
    const raw = localStorage.getItem(LS_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Append a completed session to history
 * @param {Object} session
 */
function appendHistory(session) {
  const history = getHistory();
  session.id = Date.now();
  history.unshift(session); // newest first
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * Delete a session from history by id
 * @param {number} id
 */
function deleteHistoryItem(id) {
  const history = getHistory().filter(s => s.id !== id);
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * Clear all history
 */
function clearHistory() {
  localStorage.removeItem(LS_KEYS.HISTORY);
}

// ── Session Factory ───────────────────────────────────

function createSession(budget, name = '') {
  return {
    id: Date.now(),
    name: name.trim(),
    budget: budget,
    items: [],
    createdAt: nowISO(),
  };
}

/**
 * Create a new shopping item object
 * @param {string} name
 * @param {number} price
 * @param {string} priority  "wajib" | "keinginan"
 * @param {number} qty
 * @returns {Object}
 */
function createItem(name, price, priority = 'wajib', qty = 1) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: name.trim(),
    estimatedPrice: price,
    realPrice: null,       // updated when user edits in-store
    priority: priority,
    qty: qty,
    checked: false,
  };
}

/**
 * Get the effective price of an item (real > estimated)
 * @param {Object} item
 * @returns {number}
 */
function effectivePrice(item) {
  const unit = item.realPrice !== null ? item.realPrice : item.estimatedPrice;
  return unit * (item.qty || 1);
}

// ── Budget Calculations ───────────────────────────────

/**
 * Calculate total spent from items
 * @param {Array} items
 * @returns {number}
 */
function calcTotalSpent(items) {
  return items.reduce((sum, item) => sum + effectivePrice(item), 0);
}

/**
 * Calculate total of checked (bought) items only
 * @param {Array} items
 * @returns {number}
 */
function calcCheckedTotal(items) {
  return items
    .filter(i => i.checked)
    .reduce((sum, item) => sum + effectivePrice(item), 0);
}

/**
 * Get budget status based on percentage used
 * @param {number} spent
 * @param {number} budget
 * @returns {'safe'|'warn'|'danger'}
 */
function getBudgetStatus(spent, budget) {
  if (budget === 0) return 'safe';
  const pct = (spent / budget) * 100;
  if (pct >= 100) return 'danger';
  if (pct >= 75)  return 'warn';
  return 'safe';
}

/**
 * Get status label in Indonesian
 * @param {'safe'|'warn'|'danger'} status
 * @returns {string}
 */
function statusLabel(status) {
  const map = { safe: 'Aman', warn: 'Hampir Habis', danger: 'Melebihi Budget' };
  return map[status] || 'Aman';
}

// ── Navigation Helpers ────────────────────────────────

/**
 * Detect if we're in the pages/ subdirectory
 */
const isSubPage = window.location.pathname.includes('/pages/');
const BASE = isSubPage ? '../' : './';

/**
 * Navigate to a page
 * @param {string} page  "dashboard" | "settlement" | "history" | "index"
 */
function navigate(page) {
  const [routeName, query] = page.split('?');
  const routes = {
    index:      BASE + 'index.html',
    dashboard:  BASE + 'pages/dashboard.html',
    settlement: BASE + 'pages/settlement.html',
    history:    BASE + 'pages/history.html',
  };
  const target = routes[routeName] || routes.index;
  window.location.href = target + (query ? '?' + query : '');
}

// ── DOM Helpers ───────────────────────────────────────

/**
 * Show a simple toast message
 * @param {string} message
 * @param {string} toastId  id of the toast element
 * @param {number} duration ms
 */
function showToast(message, toastId = 'saveToast', duration = 2500) {
  const el = document.getElementById(toastId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, duration);
}
