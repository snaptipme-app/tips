const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { processSuccessfulPayment } = require('../lib/processPayment');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/mock
// Public — no auth required (tourist pays without account)
// Body: { employee_username, amount, tourist_email?, payment_method? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/mock', async (req, res) => {
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

    // Find employee + their currency
    const { rows: empRows } = await pool.query(
      'SELECT id, full_name, balance, currency, country FROM employees WHERE username = $1',
      [employee_username]
    );

    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Employee "${employee_username}" not found.`,
      });
    }

    const employee = empRows[0];

    // Derive the employee's actual currency
    const COUNTRY_CURRENCY = { 'Morocco': 'MAD', 'United States': 'USD', 'France': 'EUR', 'Spain': 'EUR', 'UAE': 'AED', 'UK': 'GBP' };
    const employeeCurrency = employee.currency || COUNTRY_CURRENCY[employee.country] || 'MAD';

    // Process payment using shared function — with the REAL currency
    const payment = await processSuccessfulPayment(
      pool,
      employee.id,
      parsedAmount,
      'mock',
      null,
      tourist_email,
      employeeCurrency
    );

    console.log(
      `[payments/mock] ${parsedAmount} ${employeeCurrency} → ${employee_username} (employee_id=${employee.id}), payment_id=${payment.id}`
    );

    res.status(201).json({
      success: true,
      data: {
        payment_id: payment.id,
        employee_name: employee.full_name,
        amount: parsedAmount,
        currency: employeeCurrency,
      },
      message: `Successfully tipped ${parsedAmount.toFixed(2)} ${employeeCurrency} to ${employee.full_name}`,
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
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const { rows: payments } = await pool.query(
      'SELECT id, amount, currency, payment_method, status, tourist_email, created_at FROM payments WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
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
router.get('/history/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (String(req.employee.id) !== String(employeeId) && !req.employee.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const { rows: payments } = await pool.query(
      'SELECT * FROM payments WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    res.json({ success: true, data: { payments } });
  } catch (err) {
    console.error('[payments/history]', err.message);
    res.status(500).json({ success: false, error: 'Server error fetching payment history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-intent
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-intent', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Stripe integration coming soon. Use /api/payments/mock for now.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('[payments/webhook] Stripe webhook received (not yet implemented)');
  res.json({ received: true });
});

module.exports = router;
