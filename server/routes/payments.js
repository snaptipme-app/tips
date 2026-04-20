const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');
const { processSuccessfulPayment } = require('../lib/processPayment');

/* ── Helpers ── */
function rowsToObjs(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((vals) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}
function rowToObj(result) {
  const rows = rowsToObjs(result);
  return rows.length ? rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/mock
// Public — no auth required (tourist pays without account)
// Body: { employee_username, amount, tourist_email?, payment_method? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/mock', (req, res) => {
  try {
    const {
      employee_username,
      amount,
      tourist_email = null,
      payment_method = 'mock',
    } = req.body;

    // Validation
    if (!employee_username || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'employee_username and amount are required.',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number.',
      });
    }

    const db = getDB();

    // Find employee
    const employee = rowToObj(
      db.exec(
        'SELECT id, full_name, balance FROM employees WHERE username = ?',
        [employee_username]
      )
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee "${employee_username}" not found.`,
      });
    }

    // Process payment using shared function
    const payment = processSuccessfulPayment(
      db,
      employee.id,
      parsedAmount,
      'mock',
      null,
      tourist_email
    );

    saveDB();

    console.log(
      `[payments/mock] $${parsedAmount} → ${employee_username} (employee_id=${employee.id}), payment_id=${payment.id}`
    );

    res.status(201).json({
      success: true,
      data: {
        payment_id: payment.id,
        employee_name: employee.full_name,
        amount: parsedAmount,
      },
      message: `Successfully tipped $${parsedAmount.toFixed(2)} to ${employee.full_name}`,
    });
  } catch (err) {
    console.error('[payments/mock]', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error processing payment.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/history
// Protected — returns all payments for the logged-in employee
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', authMiddleware, (req, res) => {
  try {
    const employeeId = req.employee.id;
    const db = getDB();

    const payments = rowsToObjs(
      db.exec(
        'SELECT id, amount, payment_method, status, tourist_email, created_at FROM payments WHERE employee_id = ? ORDER BY created_at DESC',
        [employeeId]
      )
    );

    console.log(`[payments/history] employee_id=${employeeId}, count=${payments.length}`);
    res.json({ success: true, data: { payments } });
  } catch (err) {
    console.error('[payments/history]', err.message);
    res.status(500).json({ success: false, error: 'Server error fetching payment history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/history/:employeeId  (legacy — kept for backwards compat)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history/:employeeId', authMiddleware, (req, res) => {
  try {
    const { employeeId } = req.params;
    const db = getDB();

    if (String(req.employee.id) !== String(employeeId) && !req.employee.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const payments = rowsToObjs(
      db.exec(
        'SELECT * FROM payments WHERE employee_id = ? ORDER BY created_at DESC',
        [employeeId]
      )
    );

    res.json({ success: true, data: { payments } });
  } catch (err) {
    console.error('[payments/history]', err.message);
    res.status(500).json({ success: false, error: 'Server error fetching payment history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-intent
// TODO: Create Stripe PaymentIntent
// When ready:
//   1. const { amount, currency, employee_id } = req.body
//   2. const intent = await stripe.paymentIntents.create({ amount, currency })
//   3. Return { client_secret: intent.client_secret }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-intent', (req, res) => {
  // TODO: Implement Stripe PaymentIntent creation
  res.status(501).json({
    success: false,
    error: 'Stripe integration coming soon. Use /api/payments/mock for now.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// TODO: Receive Stripe webhook events
// When ready:
//   1. Verify webhook signature with stripe.webhooks.constructEvent()
//   2. Handle 'payment_intent.succeeded' event
//   3. Extract employee_id, amount, transaction_id from metadata
//   4. Call processSuccessfulPayment(db, employee_id, amount, 'stripe', transaction_id, email)
//   5. saveDB()
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // TODO: Implement Stripe webhook handler
  console.log('[payments/webhook] Stripe webhook received (not yet implemented)');
  res.json({ received: true });
});

module.exports = router;
