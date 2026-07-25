// ============================================================
// 1. STATE
// ============================================================

// Single source of truth for all expense transactions.
//
// Transaction shape:
// {
//   id:       string,   // crypto.randomUUID() or Date.now().toString()
//   name:     string,   // item name, non-empty
//   amount:   number,   // positive float
//   category: 'Food' | 'Transport' | 'Fun'
// }
let transactions = [];


// ============================================================
// 2. STORAGE
// ============================================================

const Storage = {
  KEY: 'expense_visualizer_transactions',

  /**
   * Reads transactions from localStorage and returns the parsed array.
   * Returns [] on any error (missing key, malformed JSON, unavailable storage).
   * @returns {Array<Transaction>}
   */
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw === null) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Storage.load] Failed to read from localStorage:', err);
      const banner = document.getElementById('storage-warning');
      if (banner) {
        banner.textContent = "Warning: Your browser's storage is unavailable. Expenses won't be saved between sessions.";
        banner.removeAttribute('hidden');
      }
      return [];
    }
  },

  /**
   * Serializes the given transactions array to JSON and writes it to localStorage.
   * Silently catches any write error so the in-memory state continues to work.
   * @param {Array<Transaction>} transactions
   */
  save(transactions) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(transactions));
    } catch (err) {
      console.error('[Storage.save] Failed to write to localStorage:', err);
    }
  }
};


// ============================================================
// UTILITIES
// ============================================================

/**
 * Generates a unique string ID.
 * Prefers crypto.randomUUID() where available, falls back to Date.now().toString().
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}


// ============================================================
// 3. VALIDATOR
// ============================================================

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

const Validator = {
  /**
   * Validates a transaction input object.
   * @param {{ name: string, amount: any, category: string }} param0
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  validateTransaction({ name, amount, category }) {
    const errors = {};

    // Name rule: must be non-empty after trimming
    if (!name || name.trim().length === 0) {
      errors.name = 'Item name is required.';
    }

    // Amount rule: must be a finite number greater than 0
    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Amount must be a positive number.';
    }

    // Category rule: must be exactly one of the valid categories
    if (!VALID_CATEGORIES.includes(category)) {
      errors.category = 'Please select a valid category (Food, Transport, or Fun).';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};


// ============================================================
// 4. UI MODULE
// ============================================================

const UI = {
  /**
   * Computes the sum of all transaction amounts and updates #total-spent.
   * An empty list yields $0.00.
   * @param {Array<Transaction>} transactions
   */
  renderTotal(transactions) {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const el = document.getElementById('total-spent');
    if (el) {
      el.textContent = 'Total Spent: $' + total.toFixed(2);
    }
  },

  /**
   * Rebuilds #transaction-list from the transactions array.
   * Shows #list-empty when the list is empty, hides it otherwise.
   * Each list item is built using DOM methods (not innerHTML) so that
   * the transaction name is set via textContent, preventing XSS.
   * @param {Array<Transaction>} transactions
   */
  renderList(transactions) {
    const list = document.getElementById('transaction-list');
    const empty = document.getElementById('list-empty');
    if (!list) return;

    // Clear existing items
    list.innerHTML = '';

    if (transactions.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    transactions.forEach(tx => {
      // <li class="transaction-item">
      const li = document.createElement('li');
      li.className = 'transaction-item';

      // Item name — textContent to prevent XSS (Requirement 6.2 / Task 9.3)
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tx-name';
      nameSpan.textContent = tx.name;

      // Formatted amount
      const amountSpan = document.createElement('span');
      amountSpan.className = 'tx-amount';
      amountSpan.textContent = '$' + tx.amount.toFixed(2);

      // Category badge with data-category for CSS colour hooks
      const categorySpan = document.createElement('span');
      categorySpan.className = 'tx-category';
      categorySpan.setAttribute('data-category', tx.category);
      categorySpan.textContent = tx.category;

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete';
      deleteBtn.setAttribute('data-id', tx.id);
      deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
      deleteBtn.textContent = 'Delete';

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },

  /**
   * Sets the text content of each inline error span for the given error map.
   * Unmentioned fields are left unchanged.
   * @param {{ name?: string, amount?: string, category?: string }} errors
   */
  showFormErrors(errors) {
    const nameErr = document.getElementById('error-name');
    const amountErr = document.getElementById('error-amount');
    const categoryErr = document.getElementById('error-category');

    if (nameErr)     nameErr.textContent     = errors.name     || '';
    if (amountErr)   amountErr.textContent   = errors.amount   || '';
    if (categoryErr) categoryErr.textContent = errors.category || '';
  },

  /**
   * Clears all inline form error messages.
   */
  clearFormErrors() {
    this.showFormErrors({});
  },

  /**
   * Resets #expense-form to its default empty state using the native reset().
   */
  resetForm() {
    const form = document.getElementById('expense-form');
    if (form) form.reset();
  }
};

// ============================================================
// 4b. CHART INSTANCE
// ============================================================

let chartInstance = null;


// ============================================================
// 4c. CHART HELPERS
// ============================================================

/**
 * Aggregates transaction amounts by category.
 * @param {Array<Transaction>} transactions
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function aggregateByCategory(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of transactions) {
    totals[tx.category] += tx.amount;
  }
  return totals;
}

/**
 * Renders (or hides) the Chart.js doughnut chart.
 * - If Chart.js is unavailable, logs a warning and returns early.
 * - If transactions is empty, hides the canvas and shows #chart-empty.
 * - Otherwise, destroys any existing chart instance, builds aggregated data
 *   (filtering out zero-value categories), and creates a new doughnut chart.
 * @param {Array<Transaction>} transactions
 */
UI.renderChart = function(transactions) {
  if (typeof Chart === 'undefined') {
    console.warn('[UI.renderChart] Chart.js is not available.');
    return;
  }

  const canvas = document.getElementById('chart-canvas');
  const emptyMsg = document.getElementById('chart-empty');

  if (!canvas) return;

  if (transactions.length === 0) {
    canvas.hidden = true;
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }

  // Show canvas, hide empty message
  canvas.hidden = false;
  if (emptyMsg) emptyMsg.hidden = true;

  // Destroy existing chart to prevent canvas leak
  if (chartInstance !== null) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const totals = aggregateByCategory(transactions);

  const CATEGORY_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56'
  };

  // Only include categories with amount > 0
  const labels = [];
  const data = [];
  const colors = [];

  for (const [category, amount] of Object.entries(totals)) {
    if (amount > 0) {
      labels.push(category);
      data.push(amount);
      colors.push(CATEGORY_COLORS[category]);
    }
  }

  chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
};

// ============================================================
// 5. EVENT HANDLERS & INITIALIZATION
// ============================================================

/**
 * Reads the current values from the three form fields.
 * @returns {{ name: string, amount: string, category: string }}
 */
function readFormValues() {
  return {
    name:     (document.getElementById('item-name')  || {}).value || '',
    amount:   (document.getElementById('amount')     || {}).value || '',
    category: (document.getElementById('category')   || {}).value || ''
  };
}

/**
 * Handles the expense form's submit event.
 * Prevents default submission, validates input, shows errors or commits
 * the new transaction to state, persists it, and re-renders the UI.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const data = readFormValues();
  const result = Validator.validateTransaction(data);

  if (!result.valid) {
    UI.showFormErrors(result.errors);
    return;
  }

  UI.clearFormErrors();

  const tx = {
    id:       generateId(),
    name:     data.name.trim(),
    amount:   parseFloat(data.amount),
    category: data.category
  };

  transactions.push(tx);
  Storage.save(transactions);
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);
  UI.resetForm();
}

/**
 * Removes the transaction with the given ID from state, persists the
 * updated array, and re-renders the UI.
 * @param {string} id
 */
function handleDeleteClick(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  Storage.save(transactions);
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);
}

// Event delegation on #transaction-list — listens for clicks on any
// element that carries the .btn-delete class and delegates to handleDeleteClick.
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted transactions into in-memory state
  transactions = Storage.load();

  // Initial render of all three UI components
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);

  // Attach form submit handler
  const form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Delegated delete handler on the transaction list container
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', (event) => {
      if (event.target.classList.contains('btn-delete')) {
        const id = event.target.dataset.id;
        if (id) {
          handleDeleteClick(id);
        }
      }
    });
  }
});
