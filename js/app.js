/* ============================================================
   EXPENSE & BUDGET VISUALIZER — app.js
   Features:
     - Add / delete transactions (income & expense)
     - Set budget per category
     - LocalStorage persistence
     - Pie chart (expense distribution) via Chart.js
     - Bar chart (budget vs actual) via Chart.js
     - Dark / Light mode toggle
     - Sort transactions (date, amount, category) + direction
     - Highlight transactions whose category is over budget
   ============================================================ */

'use strict';

/* ── Constants ──────────────────────────────────────────────── */
const LS_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  BUDGETS:      'ebv_budgets',
  THEME:        'ebv_theme',
  SORT_FIELD:   'ebv_sort_field',
  SORT_DIR:     'ebv_sort_dir',
};

const CATEGORY_EMOJI = {
  'Makanan':       '🍽️',
  'Transportasi':  '🚗',
  'Hiburan':       '🎮',
  'Kesehatan':     '💊',
  'Belanja':       '🛍️',
  'Tagihan':       '💡',
  'Pendidikan':    '📚',
  'Gaji':          '💰',
  'Lainnya':       '📦',
};

/* ── State ──────────────────────────────────────────────────── */
let transactions = [];   // [{ id, type, description, amount, category, date }]
let budgets      = {};   // { [category]: number }
let sortField    = 'date';
let sortDir      = 'desc'; // 'asc' | 'desc'

/* ── Chart instances ────────────────────────────────────────── */
let pieChart = null;
let barChart = null;

/* ── DOM refs ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  // Theme
  themeToggle:    $('themeToggle'),
  themeIcon:      $('themeIcon'),
  themeLabel:     $('themeLabel'),

  // Summary
  totalIncome:    $('totalIncome'),
  totalExpense:   $('totalExpense'),
  netBalance:     $('netBalance'),
  balanceCard:    document.querySelector('.balance-card'),

  // Form
  form:           $('transactionForm'),
  txType:         $('txType'),
  txDescription:  $('txDescription'),
  txAmount:       $('txAmount'),
  txCategory:     $('txCategory'),
  txDate:         $('txDate'),
  formError:      $('formError'),

  // Budget
  budgetCategory: $('budgetCategory'),
  budgetAmount:   $('budgetAmount'),
  setBudgetBtn:   $('setBudgetBtn'),
  budgetError:    $('budgetError'),
  budgetList:     $('budgetList'),

  // Charts
  expenseChart:     $('expenseChart'),
  budgetChart:      $('budgetChart'),
  chartEmpty:       $('chartEmpty'),
  budgetChartEmpty: $('budgetChartEmpty'),

  // Transactions
  transactionList: $('transactionList'),
  txEmpty:         $('txEmpty'),
  sortField:       $('sortField'),
  sortDirBtn:      $('sortDirBtn'),
  sortDirIcon:     $('sortDirIcon'),
  filterCategory:  $('filterCategory'),
  clearAllBtn:     $('clearAllBtn'),

  // Modal
  deleteModal:     $('deleteModal'),
  modalMessage:    $('modalMessage'),
  confirmDeleteBtn:$('confirmDeleteBtn'),
  cancelDeleteBtn: $('cancelDeleteBtn'),
};

/* ═══════════════════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
═══════════════════════════════════════════════════════════════ */
function loadFromLS() {
  try {
    const txRaw = localStorage.getItem(LS_KEYS.TRANSACTIONS);
    transactions = txRaw ? JSON.parse(txRaw) : [];
  } catch { transactions = []; }

  try {
    const bgRaw = localStorage.getItem(LS_KEYS.BUDGETS);
    budgets = bgRaw ? JSON.parse(bgRaw) : {};
  } catch { budgets = {}; }

  sortField = localStorage.getItem(LS_KEYS.SORT_FIELD) || 'date';
  sortDir   = localStorage.getItem(LS_KEYS.SORT_DIR)   || 'desc';
}

function saveTransactions() {
  localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

function saveBudgets() {
  localStorage.setItem(LS_KEYS.BUDGETS, JSON.stringify(budgets));
}

function saveSortPrefs() {
  localStorage.setItem(LS_KEYS.SORT_FIELD, sortField);
  localStorage.setItem(LS_KEYS.SORT_DIR,   sortDir);
}

/* ═══════════════════════════════════════════════════════════════
   THEME — Dark / Light Mode
═══════════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(LS_KEYS.THEME, theme);

  if (theme === 'dark') {
    dom.themeIcon.textContent  = '☀️';
    dom.themeLabel.textContent = 'Light Mode';
  } else {
    dom.themeIcon.textContent  = '🌙';
    dom.themeLabel.textContent = 'Dark Mode';
  }

  // Re-render charts so they pick up the new text/grid colors
  renderPieChart();
  renderBarChart();
}

function initTheme() {
  const saved = localStorage.getItem(LS_KEYS.THEME) || 'light';
  applyTheme(saved);
}

dom.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
/**
 * Format number as Indonesian Rupiah.
 * e.g. 150000 → "Rp 150.000"
 */
function formatRupiah(amount) {
  return 'Rp ' + Math.abs(amount).toLocaleString('id-ID');
}

/** Generate a simple unique ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Format date string "YYYY-MM-DD" to readable Indonesian format */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

/** Get today's date as "YYYY-MM-DD" */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Get current Chart.js-friendly colors from CSS variables */
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ═══════════════════════════════════════════════════════════════
   OVER-BUDGET DETECTION
═══════════════════════════════════════════════════════════════ */
/**
 * Returns a Set of category names where total spending exceeds budget.
 */
function getOverBudgetCategories() {
  const spent = getSpentByCategory();
  const over  = new Set();
  for (const [cat, limit] of Object.entries(budgets)) {
    if ((spent[cat] || 0) > limit) {
      over.add(cat);
    }
  }
  return over;
}

/** Returns an object { [category]: totalAmount } for expense transactions only. */
function getSpentByCategory() {
  const map = {};
  for (const tx of transactions) {
    if (tx.type === 'expense') {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    }
  }
  return map;
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY
═══════════════════════════════════════════════════════════════ */
function renderSummary() {
  let income  = 0;
  let expense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income')  income  += tx.amount;
    if (tx.type === 'expense') expense += tx.amount;
  }

  const net = income - expense;

  dom.totalIncome.textContent  = formatRupiah(income);
  dom.totalExpense.textContent = formatRupiah(expense);
  dom.netBalance.textContent   = (net < 0 ? '-' : '') + formatRupiah(net);

  dom.balanceCard.classList.toggle('negative', net < 0);
}

/* ═══════════════════════════════════════════════════════════════
   TRANSACTION FORM
═══════════════════════════════════════════════════════════════ */
// Set today's date as default
dom.txDate.value = todayStr();

dom.form.addEventListener('submit', e => {
  e.preventDefault();
  dom.formError.textContent = '';

  const type        = dom.txType.value.trim();
  const description = dom.txDescription.value.trim();
  const amount      = parseFloat(dom.txAmount.value);
  const category    = dom.txCategory.value.trim();
  const date        = dom.txDate.value.trim();

  // Validation
  if (!description) {
    dom.formError.textContent = '⚠️ Deskripsi tidak boleh kosong.';
    dom.txDescription.focus();
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    dom.formError.textContent = '⚠️ Jumlah harus lebih dari 0.';
    dom.txAmount.focus();
    return;
  }
  if (!category) {
    dom.formError.textContent = '⚠️ Pilih kategori terlebih dahulu.';
    dom.txCategory.focus();
    return;
  }
  if (!date) {
    dom.formError.textContent = '⚠️ Tanggal tidak boleh kosong.';
    dom.txDate.focus();
    return;
  }

  const tx = { id: genId(), type, description, amount, category, date };
  transactions.push(tx);
  saveTransactions();

  // Reset form (keep date & type)
  dom.txDescription.value = '';
  dom.txAmount.value      = '';
  dom.txCategory.value    = '';

  renderAll();
});

/* ═══════════════════════════════════════════════════════════════
   DELETE TRANSACTION — with confirmation modal
═══════════════════════════════════════════════════════════════ */
let pendingDeleteId = null;

function openDeleteModal(id, description) {
  pendingDeleteId = id;
  dom.modalMessage.textContent = `Yakin ingin menghapus "${description}"?`;
  dom.deleteModal.hidden = false;
}

function closeDeleteModal() {
  pendingDeleteId = null;
  dom.deleteModal.hidden = true;
}

dom.confirmDeleteBtn.addEventListener('click', () => {
  if (pendingDeleteId !== null) {
    transactions = transactions.filter(tx => tx.id !== pendingDeleteId);
    saveTransactions();
    renderAll();
  }
  closeDeleteModal();
});

dom.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

// Close modal on overlay click
dom.deleteModal.addEventListener('click', e => {
  if (e.target === dom.deleteModal) closeDeleteModal();
});

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !dom.deleteModal.hidden) closeDeleteModal();
});

/* ═══════════════════════════════════════════════════════════════
   CLEAR ALL TRANSACTIONS
═══════════════════════════════════════════════════════════════ */
dom.clearAllBtn.addEventListener('click', () => {
  if (transactions.length === 0) return;
  if (confirm('Hapus SEMUA transaksi? Tindakan ini tidak dapat dibatalkan.')) {
    transactions = [];
    saveTransactions();
    renderAll();
  }
});

/* ═══════════════════════════════════════════════════════════════
   SORT CONTROLS
═══════════════════════════════════════════════════════════════ */
// Sync UI with saved sort prefs
function initSortUI() {
  dom.sortField.value      = sortField;
  dom.sortDirIcon.textContent = sortDir === 'asc' ? '↑' : '↓';
}

dom.sortField.addEventListener('change', () => {
  sortField = dom.sortField.value;
  saveSortPrefs();
  renderTransactionList();
});

dom.sortDirBtn.addEventListener('click', () => {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  dom.sortDirIcon.textContent = sortDir === 'asc' ? '↑' : '↓';
  saveSortPrefs();
  renderTransactionList();
});

dom.filterCategory.addEventListener('change', renderTransactionList);

/**
 * Returns a sorted (and optionally filtered) copy of transactions.
 */
function getSortedFiltered() {
  const filterCat = dom.filterCategory.value;

  let list = filterCat
    ? transactions.filter(tx => tx.category === filterCat)
    : [...transactions];

  list.sort((a, b) => {
    let valA, valB;

    switch (sortField) {
      case 'amount':
        valA = a.amount;
        valB = b.amount;
        break;
      case 'category':
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
        break;
      case 'date':
      default:
        valA = a.date;
        valB = b.date;
        break;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  return list;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: TRANSACTION LIST
═══════════════════════════════════════════════════════════════ */
function renderTransactionList() {
  const list    = getSortedFiltered();
  const overCats = getOverBudgetCategories();

  dom.transactionList.innerHTML = '';

  if (list.length === 0) {
    dom.txEmpty.style.display = 'block';
    return;
  }
  dom.txEmpty.style.display = 'none';

  const frag = document.createDocumentFragment();

  for (const tx of list) {
    const isOverBudget = tx.type === 'expense' && overCats.has(tx.category);
    const emoji        = CATEGORY_EMOJI[tx.category] || '📦';

    const li = document.createElement('li');
    li.className = 'tx-item' + (isOverBudget ? ' over-budget' : '');
    li.dataset.id = tx.id;

    // Over-budget badge HTML
    const badgeHtml = isOverBudget
      ? '<span class="over-budget-badge">Over Budget</span>'
      : '';

    li.innerHTML = `
      <span class="tx-type-dot ${tx.type}" aria-hidden="true"></span>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(tx.description)}${badgeHtml}</div>
        <div class="tx-meta">${emoji} ${escapeHtml(tx.category)} · ${formatDate(tx.date)}</div>
      </div>
      <span class="tx-amount ${tx.type}" aria-label="${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(tx.amount)}">
        ${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}
      </span>
      <button class="tx-del-btn" data-id="${tx.id}" aria-label="Hapus transaksi ${escapeHtml(tx.description)}" title="Hapus">🗑️</button>
    `;

    frag.appendChild(li);
  }

  dom.transactionList.appendChild(frag);

  // Attach delete handlers via delegation (already on list, but we rebind on each render)
}

// Event delegation for delete buttons in transaction list
dom.transactionList.addEventListener('click', e => {
  const btn = e.target.closest('.tx-del-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  const tx = transactions.find(t => t.id === id);
  if (tx) openDeleteModal(id, tx.description);
});

/** Simple HTML escape to prevent XSS from user input */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ═══════════════════════════════════════════════════════════════
   BUDGET MANAGEMENT
═══════════════════════════════════════════════════════════════ */
dom.setBudgetBtn.addEventListener('click', () => {
  dom.budgetError.textContent = '';
  const cat    = dom.budgetCategory.value;
  const amount = parseFloat(dom.budgetAmount.value);

  if (!cat) {
    dom.budgetError.textContent = '⚠️ Pilih kategori.';
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    dom.budgetError.textContent = '⚠️ Budget harus lebih dari 0.';
    dom.budgetAmount.focus();
    return;
  }

  budgets[cat] = amount;
  saveBudgets();
  dom.budgetAmount.value    = '';
  dom.budgetCategory.value  = '';
  renderBudgetList();
  renderBarChart();
  renderTransactionList(); // re-check over-budget highlights
});

function renderBudgetList() {
  dom.budgetList.innerHTML = '';

  const entries = Object.entries(budgets);
  if (entries.length === 0) {
    dom.budgetList.innerHTML = '<li style="font-size:0.82rem;color:var(--clr-text-muted);">Belum ada budget diatur.</li>';
    return;
  }

  const spent   = getSpentByCategory();
  const overCats = getOverBudgetCategories();

  for (const [cat, limit] of entries) {
    const usedAmt  = spent[cat] || 0;
    const emoji    = CATEGORY_EMOJI[cat] || '📦';
    const isOver   = overCats.has(cat);
    const pct      = Math.min(Math.round((usedAmt / limit) * 100), 100);

    const li = document.createElement('li');
    li.className = 'budget-item' + (isOver ? ' over-budget' : '');

    li.innerHTML = `
      <span class="budget-item-name">${emoji} ${escapeHtml(cat)}</span>
      <span class="budget-item-amount" title="${formatRupiah(usedAmt)} / ${formatRupiah(limit)}">
        ${formatRupiah(usedAmt)} / ${formatRupiah(limit)}
        ${isOver ? '<span class="over-budget-badge">Over!</span>' : `(${pct}%)`}
      </span>
      <button class="budget-item-del" data-cat="${escapeHtml(cat)}" aria-label="Hapus budget ${escapeHtml(cat)}" title="Hapus budget">✕</button>
    `;

    dom.budgetList.appendChild(li);
  }
}

// Delete budget item
dom.budgetList.addEventListener('click', e => {
  const btn = e.target.closest('.budget-item-del');
  if (!btn) return;
  const cat = btn.dataset.cat;
  if (cat && budgets[cat] !== undefined) {
    delete budgets[cat];
    saveBudgets();
    renderBudgetList();
    renderBarChart();
    renderTransactionList();
  }
});

/* ═══════════════════════════════════════════════════════════════
   CHART.JS — PIE CHART (Expense Distribution)
═══════════════════════════════════════════════════════════════ */
const CHART_COLORS = [
  '#4c6ef5', '#f59f00', '#40c057', '#fa5252',
  '#74c0fc', '#e64980', '#20c997', '#ff922b',
  '#a9e34b', '#cc5de8',
];

function renderPieChart() {
  const spent   = getSpentByCategory();
  const labels  = Object.keys(spent);
  const data    = Object.values(spent);
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const textClr = isDark ? '#a8b2cc' : '#4a5568';

  if (labels.length === 0) {
    dom.chartEmpty.classList.remove('hidden');
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    return;
  }

  dom.chartEmpty.classList.add('hidden');

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: CHART_COLORS.slice(0, labels.length),
      borderColor:     isDark ? '#1a1d27' : '#ffffff',
      borderWidth:     2,
      hoverOffset:     8,
    }],
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color:    textClr,
          padding:  14,
          font:     { size: 12 },
          boxWidth: 14,
        },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
            return ` ${formatRupiah(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (pieChart) {
    pieChart.data    = chartData;
    pieChart.options = options;
    pieChart.update();
  } else {
    pieChart = new Chart(dom.expenseChart, {
      type:    'doughnut',
      data:    chartData,
      options,
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   CHART.JS — BAR CHART (Budget vs Actual)
═══════════════════════════════════════════════════════════════ */
function renderBarChart() {
  const entries = Object.entries(budgets);
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const textClr = isDark ? '#a8b2cc' : '#4a5568';
  const gridClr = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  if (entries.length === 0) {
    dom.budgetChartEmpty.classList.remove('hidden');
    if (barChart) { barChart.destroy(); barChart = null; }
    return;
  }

  dom.budgetChartEmpty.classList.add('hidden');

  const spent   = getSpentByCategory();
  const labels  = entries.map(([cat]) => cat);
  const budgetVals = entries.map(([, v]) => v);
  const spentVals  = entries.map(([cat]) => spent[cat] || 0);

  // Color spent bars: red if over budget, green if within
  const spentBgColors = entries.map(([cat], i) => {
    const isOver = (spent[cat] || 0) > budgets[cat];
    return isOver ? 'rgba(252, 129, 129, 0.85)' : 'rgba(64, 192, 87, 0.85)';
  });

  const chartData = {
    labels,
    datasets: [
      {
        label:           'Budget',
        data:            budgetVals,
        backgroundColor: 'rgba(76, 110, 245, 0.65)',
        borderColor:     'rgba(76, 110, 245, 1)',
        borderWidth:     1.5,
        borderRadius:    6,
      },
      {
        label:           'Aktual',
        data:            spentVals,
        backgroundColor: spentBgColors,
        borderColor:     spentBgColors.map(c => c.replace('0.85', '1')),
        borderWidth:     1.5,
        borderRadius:    6,
      },
    ],
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color:    textClr,
          font:     { size: 12 },
          boxWidth: 14,
          padding:  14,
        },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            return ` ${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textClr, font: { size: 11 } },
        grid:  { color: gridClr },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color:    textClr,
          font:     { size: 11 },
          callback: v => 'Rp ' + v.toLocaleString('id-ID'),
        },
        grid: { color: gridClr },
      },
    },
  };

  if (barChart) {
    barChart.data    = chartData;
    barChart.options = options;
    barChart.update();
  } else {
    barChart = new Chart(dom.budgetChart, {
      type:    'bar',
      data:    chartData,
      options,
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════════════════════════════ */
function renderAll() {
  renderSummary();
  renderTransactionList();
  renderBudgetList();
  renderPieChart();
  renderBarChart();
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
function init() {
  loadFromLS();
  initTheme();    // applies theme & triggers chart re-render (safe—charts not built yet)
  initSortUI();
  renderAll();
}

init();
