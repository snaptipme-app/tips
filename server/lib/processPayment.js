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
 * @param {object}  pool          - Postgres pool instance
 * @param {number}  employeeId    - Employee ID (integer)
 * @param {number}  amount        - Payment amount (float, > 0)
 * @param {string}  method        - Payment method ('mock' | 'stripe')
 * @param {string|null} transactionId - Stripe payment ID or null for mock
 * @param {string|null} touristEmail  - Tourist's email (optional)
 * @returns {object} The created payment object
 */
async function processSuccessfulPayment(pool, employeeId, amount, method, transactionId, touristEmail) {
  // 1. Insert payment record
  const { rows: paymentRows } = await pool.query(
    `INSERT INTO payments (employee_id, amount, payment_method, status, stripe_payment_id, tourist_email)
     VALUES ($1, $2, $3, 'completed', $4, $5) RETURNING *`,
    [employeeId, amount, method, transactionId || null, touristEmail || null]
  );
  const payment = paymentRows[0];

  // 2. Update employee balance
  await pool.query(
    'UPDATE employees SET balance = balance + $1 WHERE id = $2',
    [amount, employeeId]
  );

  // 3. Insert into tips table (keeps existing dashboard/analytics working)
  await pool.query(
    "INSERT INTO tips (employee_id, amount, status) VALUES ($1, $2, 'completed')",
    [employeeId, amount]
  );

  if (!payment) {
    return { id: null, employee_id: employeeId, amount, method, status: 'completed' };
  }

  return payment;
}

module.exports = { processSuccessfulPayment };
