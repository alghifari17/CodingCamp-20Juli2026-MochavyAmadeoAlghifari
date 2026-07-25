# Requirements Document

## Introduction

The Expense & Budget Visualizer is a standalone client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to log daily expenses by item name, amount, and category (Food, Transport, Fun). All data is persisted in the browser's Local Storage. The app displays a running total of all expenses and a real-time pie chart showing spending distribution by category. No backend, no framework, no testing setup required.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of a name, amount, and category.
- **Category**: One of three fixed labels — Food, Transport, or Fun — used to classify a transaction.
- **Total Spent**: The sum of all transaction amounts currently stored.
- **Transaction List**: The scrollable UI component that renders all stored transactions.
- **Pie Chart**: A canvas-based chart displaying the percentage breakdown of spending per category.
- **Local Storage**: The browser's built-in `localStorage` API used for client-side data persistence.
- **Input Form**: The HTML form through which users submit new transactions.
- **Validator**: The client-side logic responsible for checking form field values before submission.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to add expense transactions through a form, so that I can record what I spent money on.

#### Acceptance Criteria

1. THE Input Form SHALL contain a text field for item name, a numeric field for amount, and a dropdown selector for category (Food, Transport, Fun).
2. WHEN a user submits the Input Form with all fields filled and a positive amount, THE App SHALL create a new Transaction and add it to the stored transaction list.
3. WHEN a user submits the Input Form with any field empty or the amount is zero or negative, THE Validator SHALL prevent submission and display an inline error message identifying the missing or invalid field.
4. WHEN a transaction is successfully added, THE Input Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE Transaction List SHALL render all stored transactions, each showing item name, amount, and category label.
2. WHILE the transaction list contains more items than fit in the visible area, THE Transaction List SHALL remain scrollable without affecting the rest of the page layout.
3. WHEN a user clicks the delete control on a transaction entry, THE App SHALL remove that transaction from storage and immediately re-render the Transaction List without a page reload.
4. IF the transaction list is empty, THEN THE Transaction List SHALL display a placeholder message indicating no transactions have been recorded.

---

### Requirement 3: Total Spent Display

**User Story:** As a user, I want to see the running total of all my expenses at the top of the page, so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL display the sum of all transaction amounts as the Total Spent value in a prominent position at the top of the page.
2. WHEN a transaction is added, THE Total Spent display SHALL update to reflect the new sum without requiring a page reload.
3. WHEN a transaction is deleted, THE Total Spent display SHALL update to reflect the reduced sum without requiring a page reload.
4. WHEN no transactions exist, THE Total Spent display SHALL show a value of zero.

---

### Requirement 4: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie Chart SHALL display the proportional spending for each category (Food, Transport, Fun) as distinct color-coded segments.
2. WHEN a transaction is added or deleted, THE Pie Chart SHALL update automatically to reflect the current category totals without requiring a page reload.
3. IF only one category has transactions, THEN THE Pie Chart SHALL display a single full-circle segment for that category.
4. IF no transactions exist, THEN THE App SHALL display a placeholder or empty state in place of the Pie Chart.
5. WHERE Chart.js or an equivalent lightweight charting library is used, THE App SHALL load the library from a CDN with no build step required.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to persist across browser sessions, so that I do not lose my expense history when I close and reopen the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL immediately serialize and write the full transaction list to Local Storage.
2. WHEN a transaction is deleted, THE App SHALL immediately update and write the revised transaction list to Local Storage.
3. WHEN the App initializes, THE App SHALL read all transactions from Local Storage and render them in the Transaction List and Pie Chart before any user interaction.
4. IF Local Storage is unavailable or throws an error on read, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning to the user.

---

### Requirement 6: Project Structure & Technical Constraints

**User Story:** As a developer, I want the project to follow a clean, minimal structure, so that the code is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be deliverable as a single `index.html` file, one `css/style.css` file, and one `js/app.js` file with no additional source files.
2. THE App SHALL use only HTML, CSS, and Vanilla JavaScript with no frameworks, build tools, or backend server.
3. THE App SHALL function correctly in Chrome, Firefox, Edge, and Safari without browser-specific polyfills.
4. THE App SHALL load and be fully interactive within 3 seconds on a standard broadband connection.
