# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page expense tracker as three files (`index.html`, `css/style.css`, `js/app.js`).
Implementation proceeds in layers: HTML shell → CSS layout → JS state/storage → JS UI rendering →
JS event wiring → chart integration → polish and edge cases.

No testing framework is set up. The project has no test setup by design (NFR-1).

---

## Tasks

- [x] 1. Create the HTML shell (`index.html`)
  - Write the full `index.html` with all structural sections: `<header>` (total-spent), form section, chart section, transaction list section
  - Include all form fields: text input for name, number input for amount, select dropdown for category (Food / Transport / Fun)
  - Add `<span class="error-msg">` elements below each form field for inline validation feedback
  - Add `<canvas id="chart-canvas">` and `<p id="chart-empty" hidden>` inside the chart section
  - Add `<ul id="transaction-list">` and `<p id="list-empty" hidden>` inside the list section
  - Include `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>` before `js/app.js`
  - Link `css/style.css` in `<head>`
  - _Requirements: 1.1, 2.1, 2.4, 3.1, 4.4, 6.1, 6.2_

- [x] 2. Write CSS layout and visual styles (`css/style.css`)
  - Define CSS custom properties for category colors (`--color-food`, `--color-transport`, `--color-fun`) and error color
  - Style the page with a clean neutral background, readable typography, and clear visual hierarchy
  - Use Flexbox or Grid to arrange the form and chart side-by-side on wider screens; single column on narrow screens
  - Apply `max-height` and `overflow-y: auto` to `#transaction-list` for scrollable overflow
  - Style the submit button with an accent color; style form fields with visible focus states
  - Style `.error-msg` elements: red color, small font, initially hidden (empty text = invisible)
  - Style each transaction list item to show name, amount, and category badge clearly, with a delete button aligned to the right
  - _Requirements: 2.2, NFR-2, NFR-3_

- [x] 3. Implement State and Storage module (`js/app.js` — Part 1)
  - Declare the top-level `let transactions = []` array
  - Implement the `Storage` object with `KEY`, `load()`, and `save(transactions)` methods
  - `Storage.load()`: reads from `localStorage`, parses JSON, returns the array; catches any error, logs it, returns `[]`
  - `Storage.save()`: serializes the array to JSON, writes to `localStorage`; catches any write error silently
  - Implement `generateId()` using `crypto.randomUUID()` with a `Date.now().toString()` fallback
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Implement the Validator module (`js/app.js` — Part 2)
  - Implement `Validator.validateTransaction({ name, amount, category })`
  - Returns `{ valid: true, errors: {} }` when all fields pass; `{ valid: false, errors: {...} }` otherwise
  - Name rule: `name.trim().length > 0`
  - Amount rule: value is a finite number and `> 0`
  - Category rule: value is exactly one of `['Food', 'Transport', 'Fun']`
  - _Requirements: 1.3_

- [x] 5. Implement UI rendering functions (`js/app.js` — Part 3)
  - Implement `UI.renderTotal(transactions)`: compute sum of all amounts, update `#total-spent` text
  - Implement `UI.renderList(transactions)`: rebuild `#transaction-list` innerHTML from the transactions array; show/hide `#list-empty` based on whether list is empty; each item includes name, formatted amount, category, and a delete button with `data-id` attribute
  - Implement `UI.showFormErrors(errors)` and `UI.clearFormErrors()`: set/clear text content of `#error-name`, `#error-amount`, `#error-category`
  - Implement `UI.resetForm()`: reset `#expense-form` using the native `.reset()` method
  - _Requirements: 1.4, 2.1, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 6. Implement Chart rendering (`js/app.js` — Part 4)
  - Declare module-level `let chartInstance = null`
  - Implement `aggregateByCategory(transactions)`: returns `{ Food: n, Transport: n, Fun: n }` by summing amounts per category
  - Implement `UI.renderChart(transactions)`: if transactions is empty, hide `#chart-canvas` and show `#chart-empty`; otherwise destroy any existing `chartInstance`, show canvas, create a new `Chart` (pie or doughnut) with the aggregated data and fixed category colors
  - Category colors: Food `#FF6384`, Transport `#36A2EB`, Fun `#FFCE56`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Wire up event handlers and initialization (`js/app.js` — Part 5)
  - Implement `readFormValues()`: reads and returns `{ name, amount, category }` from the three form elements
  - Implement `handleFormSubmit(event)`: prevent default → read values → validate → show errors or clear errors + mutate state + save + render all
  - Implement `handleDeleteClick(id)`: filter transactions, save, render all
  - Wire `#transaction-list` click event using event delegation: detect clicks on delete buttons via `data-id`, call `handleDeleteClick`
  - Wire the `DOMContentLoaded` listener: load from storage, render all three UI components, attach form submit handler
  - _Requirements: 1.2, 1.3, 1.4, 2.3, 5.1, 5.2, 5.3_

- [x] 8. Checkpoint — Manual smoke test
  - Open `index.html` directly in a browser (no server needed)
  - Verify: adding a valid transaction updates the list, total, and chart
  - Verify: submitting with empty fields shows inline errors
  - Verify: deleting a transaction updates list, total, and chart
  - Verify: refreshing the page restores all transactions from localStorage
  - Verify: the page renders without console errors in Chrome, Firefox, and Edge
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Edge cases and error hardening
  - [x] 9.1 Handle localStorage unavailability
    - Wrap `Storage.load()` and `Storage.save()` so that any thrown error (e.g., `SecurityError` in private browsing) is caught and the app continues working in-memory
    - Show a non-blocking warning banner when `Storage.load()` fails
    - _Requirements: 5.4_
  - [x] 9.2 Handle Chart.js CDN failure gracefully
    - Add a check in `UI.renderChart` for `typeof Chart === 'undefined'`; if missing, log a warning and skip chart rendering without throwing
    - _Requirements: 4.5_
  - [x] 9.3 Sanitize rendered transaction names
    - When injecting transaction names into the DOM via `renderList`, use `textContent` (not `innerHTML`) to prevent XSS
    - _Requirements: 6.2_

- [x] 10. Final checkpoint — Full integration review
  - Confirm that `index.html`, `css/style.css`, and `js/app.js` are the only project files (excluding `.kiro/` spec directory)
  - Confirm no `<script>` tags with inline JavaScript exist in `index.html`
  - Confirm the app works offline (CDN aside) by checking all logic runs without network
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- No testing framework is required or set up — this is a pure frontend project (NFR-1)
- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan since no test tasks are required)
- Each task references specific requirements for traceability
- Checkpoints are included to validate progress incrementally
- The order is important: HTML → CSS → State/Storage → Validator → UI rendering → Chart → Wiring → Polish
