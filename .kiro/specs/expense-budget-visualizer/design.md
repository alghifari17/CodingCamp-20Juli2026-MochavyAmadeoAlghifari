# Design Document — Expense & Budget Visualizer

## Overview

A single-page, zero-dependency expense tracking web app delivered as three files:
`index.html`, `css/style.css`, and `js/app.js`. No build step, no server, no framework.
Chart.js is loaded from a CDN for pie chart rendering. All state lives in the browser's
`localStorage` and in a module-level in-memory array that mirrors it.

---

## Architecture

```
index.html          ← shell: imports style.css, Chart.js CDN, app.js
css/style.css       ← all visual styles
js/app.js           ← all logic: state, storage, rendering, event wiring
```

### Runtime Data Flow

```
User Action (add/delete)
        │
        ▼
  State Mutation (transactions[])
        │
        ├──▶ Storage.save(transactions)    → localStorage
        ├──▶ UI.renderList(transactions)   → #transaction-list
        ├──▶ UI.renderTotal(transactions)  → #total-spent
        └──▶ UI.renderChart(transactions)  → #chart-canvas
```

On page load:
```
localStorage.getItem('transactions')
        │
        ▼
  JSON.parse  →  transactions[]
        │
        ├──▶ UI.renderList
        ├──▶ UI.renderTotal
        └──▶ UI.renderChart
```

---

## Module Design (inside `js/app.js`)

The file is organized into clearly delimited sections with no class syntax —
plain functions and a single top-level state variable.

### 1. State

```javascript
// Single source of truth
let transactions = [];   // Array<Transaction>

// Transaction shape:
// {
//   id:       string,   // crypto.randomUUID() or Date.now().toString()
//   name:     string,   // item name, non-empty
//   amount:   number,   // positive float
//   category: 'Food' | 'Transport' | 'Fun'
// }
```

### 2. Storage Module

Encapsulates all `localStorage` access. Prevents the rest of the app from touching
the storage API directly.

```javascript
const Storage = {
  KEY: 'expense_visualizer_transactions',

  load() {
    // Returns Array<Transaction> or [] on any error
  },

  save(transactions) {
    // Serializes to JSON and writes to localStorage
    // Silent no-op if localStorage is unavailable
  }
};
```

### 3. Validator Module

Pure functions — no side effects, no DOM access. Returns structured results
so the caller decides how to display errors.

```javascript
const Validator = {
  // Returns { valid: boolean, errors: { name?, amount?, category? } }
  validateTransaction({ name, amount, category }) { ... }
};
```

Validation rules:
- `name`: non-empty string after `.trim()`
- `amount`: parseable to a finite number greater than 0
- `category`: one of `['Food', 'Transport', 'Fun']`

### 4. UI Module

All DOM read/write is isolated here. Functions are called after every state change.

```javascript
const UI = {
  renderList(transactions)  { ... },   // rebuilds #transaction-list innerHTML
  renderTotal(transactions) { ... },   // updates #total-spent text
  renderChart(transactions) { ... },   // destroys + recreates Chart.js instance
  showFormErrors(errors)    { ... },   // injects error messages under form fields
  clearFormErrors()         { ... },   // removes error messages
  resetForm()               { ... },   // resets #expense-form to defaults
};
```

**Chart management**: A module-level variable `let chartInstance = null` tracks the
current Chart.js instance. Before each render, the existing instance is destroyed via
`chartInstance.destroy()` to prevent canvas leak.

### 5. Event Handlers

Wired once on `DOMContentLoaded`. No inline HTML event attributes.

```javascript
function handleFormSubmit(event) {
  event.preventDefault();
  const data = readFormValues();
  const result = Validator.validateTransaction(data);
  if (!result.valid) {
    UI.showFormErrors(result.errors);
    return;
  }
  UI.clearFormErrors();
  const tx = { id: generateId(), ...data, amount: parseFloat(data.amount) };
  transactions.push(tx);
  Storage.save(transactions);
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);
  UI.resetForm();
}

function handleDeleteClick(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  Storage.save(transactions);
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);
}
```

### 6. Initialization

```javascript
document.addEventListener('DOMContentLoaded', () => {
  transactions = Storage.load();
  UI.renderList(transactions);
  UI.renderTotal(transactions);
  UI.renderChart(transactions);
  document.getElementById('expense-form').addEventListener('submit', handleFormSubmit);
});
```

---

## HTML Structure (`index.html`)

```html
<body>
  <header>
    <h1>Expense Tracker</h1>
    <div id="total-spent">Total Spent: $0.00</div>
  </header>

  <main>
    <!-- Input Form -->
    <section id="form-section">
      <form id="expense-form">
        <div class="field-group">
          <label for="item-name">Item Name</label>
          <input id="item-name" type="text" placeholder="e.g. Lunch">
          <span class="error-msg" id="error-name"></span>
        </div>
        <div class="field-group">
          <label for="amount">Amount</label>
          <input id="amount" type="number" min="0.01" step="0.01" placeholder="0.00">
          <span class="error-msg" id="error-amount"></span>
        </div>
        <div class="field-group">
          <label for="category">Category</label>
          <select id="category">
            <option value="">-- Select --</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Fun">Fun</option>
          </select>
          <span class="error-msg" id="error-category"></span>
        </div>
        <button type="submit">Add Expense</button>
      </form>
    </section>

    <!-- Chart -->
    <section id="chart-section">
      <canvas id="chart-canvas"></canvas>
      <p id="chart-empty" hidden>No expenses yet.</p>
    </section>

    <!-- Transaction List -->
    <section id="list-section">
      <ul id="transaction-list"></ul>
      <p id="list-empty" hidden>No transactions recorded.</p>
    </section>
  </main>
</body>
```

---

## CSS Design (`css/style.css`)

Visual strategy:
- CSS custom properties (`--color-food`, `--color-transport`, `--color-fun`) for consistent category colors
- Flexbox/Grid layout for responsive two-column form + chart arrangement
- `max-height` + `overflow-y: auto` on `#transaction-list` for scrollability
- Minimal color palette: neutral background, one accent color for the submit button
- Error messages use `color: var(--color-error)` and appear inline below each field

---

## Data Models

### Transaction

| Field    | Type                            | Constraints                        |
|----------|---------------------------------|------------------------------------|
| id       | string                          | Unique, non-empty                  |
| name     | string                          | Non-empty after trim               |
| amount   | number                          | Finite, > 0                        |
| category | 'Food' \| 'Transport' \| 'Fun' | Must be one of the three values    |

### Storage Schema

Key: `expense_visualizer_transactions`
Value: JSON-serialized `Array<Transaction>`

---

## Chart.js Integration

- Library: Chart.js v4 via CDN (`https://cdn.jsdelivr.net/npm/chart.js`)
- Chart type: `'doughnut'` or `'pie'`
- Data: aggregated per-category totals computed fresh on every render call
- Colors: fixed per category — Food: `#FF6384`, Transport: `#36A2EB`, Fun: `#FFCE56`
- On empty data: hide `<canvas>`, show `#chart-empty` paragraph

```javascript
// Category aggregation — pure function
function aggregateByCategory(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of transactions) {
    totals[tx.category] += tx.amount;
  }
  return totals;   // { Food: number, Transport: number, Fun: number }
}
```

---

## Error Handling

| Scenario                      | Behavior                                               |
|-------------------------------|--------------------------------------------------------|
| localStorage read error       | Catch, log to console, initialize with `[]`, show non-blocking warning banner |
| localStorage write error      | Catch, log to console, continue (in-memory state still works) |
| Chart.js CDN unavailable      | Canvas remains blank; rest of app functional           |
| Invalid form submission        | Inline field-level error messages; form not submitted  |
| Amount is NaN after parseFloat | Caught by Validator before state mutation              |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction is always accepted

For any combination of non-empty name, positive numeric amount, and valid category (Food, Transport, or Fun), the `Validator.validateTransaction` function SHALL return `{ valid: true }` with no errors.

**Validates: Requirements 1.2**

### Property 2: Invalid transaction is always rejected

For any input where the name is empty or whitespace-only, the amount is zero or negative or non-numeric, or the category is not one of the three valid values, the `Validator.validateTransaction` function SHALL return `{ valid: false }` with at least one error entry.

**Validates: Requirements 1.3**

### Property 3: Total spent equals sum of all transaction amounts

For any list of transactions (including the empty list), the value computed by the total-spent calculation function SHALL equal the arithmetic sum of all `amount` fields. An empty list yields zero.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Category aggregation is correct and exhaustive

For any list of transactions, the `aggregateByCategory` function SHALL return an object where each category value equals the sum of `amount` for all transactions with that category, and the three category values sum to the overall total.

**Validates: Requirements 4.1, 4.2**

### Property 5: Persistence round-trip preserves all transaction data

For any list of transactions written to storage via `Storage.save`, a subsequent call to `Storage.load` SHALL return an array that is deeply equal to the original list (same length, same field values in each entry).

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Delete removes exactly the target transaction

For any transaction list and any transaction ID present in that list, filtering the list by that ID SHALL produce a list with exactly one fewer item, and no item in the result SHALL have that ID.

**Validates: Requirements 2.3**
