/**
 * processSuccessfulPayment — Core payment processing function
 *
 * This is a PURE DATABASE FUNCTION. It knows nothing about HTTP, Express,
 * or request/response objects. It performs exactly 3 operations:
 *   1. Insert a payment record
 *   2. Update the employee's balance
 *   3. Insert into tips table (for dashboard compatibility)
 *
 * When Stripe is ready, the webhook handler will call this same function
 * with method='stripe' and the real Stripe transaction ID.
 *
 * @param {object}  db            - sql.js database instance
 * @param {number}  employeeId    - Employee ID (integer)
 * @param {number}  amount        - Payment amount (float, > 0)
 * @param {string}  method        - Payment method ('mock' | 'stripe')
 * @param {string|null} transactionId - Stripe payment ID or null for mock
 * @param {string|null} touristEmail  - Tourist's email (optional)
 * @returns {object} The created payment object
 */
function processSuccessfulPayment(db, employeeId, amount, method, transactionId, touristEmail) {
  // 1. Insert payment record
  db.run(
    `INSERT INTO payments (employee_id, amount, currency, payment_method, status, stripe_payment_id, tourist_email)
     VALUES (?, ?, 'USD', ?, 'completed', ?, ?)`,
    [employeeId, amount, method, transactionId || null, touristEmail || null]
  );

  // 2. Update employee balance
  db.run(
    'UPDATE employees SET balance = balance + ? WHERE id = ?',
    [amount, employeeId]
  );

  // 3. Insert into tips table (keeps existing dashboard/analytics working)
  db.run(
    "INSERT INTO tips (employee_id, amount, status) VALUES (?, ?, 'completed')",
    [employeeId, amount]
  );

  // 4. Get the created payment
  const result = db.exec(
    'SELECT * FROM payments WHERE employee_id = ? ORDER BY id DESC LIMIT 1',
    [employeeId]
  );

  if (!result || result.length === 0 || result[0].values.length === 0) {
    return { id: null, employee_id: employeeId, amount, method, status: 'completed' };
  }

  const { columns, values } = result[0];
  const payment = {};
  columns.forEach((col, i) => { payment[col] = values[0][i]; });

  return payment;
}

module.exports = { processSuccessfulPayment };
