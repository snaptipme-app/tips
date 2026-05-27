const express = require('express');
const { pool } = require('../db');
const { stripe, stripeConfigError } = require('../lib/stripe');
const { processSuccessfulPayment } = require('../lib/processPayment');
const { logFromReq } = require('../lib/audit');

const router = express.Router();

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'HKD']);

function normalizeCurrency(currency) {
  return String(currency || 'MAD').trim().toUpperCase();
}

function toStripeAmount(amount, currency) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency))
    ? Math.round(numericAmount)
    : Math.round(numericAmount * 100);
}

function fromStripeAmount(amount, currency) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return 0;
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency))
    ? numericAmount
    : numericAmount / 100;
}

function parseRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

router.post('/create-intent', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    if (!stripe) {
      console.error(`[payment/create-intent:${requestId}] Stripe unavailable: ${stripeConfigError}`);
      return res.status(503).json({
        success: false,
        error: stripeConfigError,
      });
    }

    const {
      amount,
      currency: requestedCurrency,
      employeeId: employeeIdCamel,
      employee_id: employeeIdSnake,
      tourist_email = null,
      rating = null,
    } = req.body;
    const employeeId = employeeIdCamel || employeeIdSnake;

    console.log(`[payment/create-intent:${requestId}] received`, {
      employeeId,
      amount,
      requestedCurrency,
      hasTouristEmail: Boolean(tourist_email),
      rating,
    });

    if (!employeeId || amount === undefined) {
      console.warn(`[payment/create-intent:${requestId}] missing employeeId or amount`);
      return res.status(400).json({
        success: false,
        error: 'employeeId and amount are required.',
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      console.warn(`[payment/create-intent:${requestId}] invalid amount`, { amount });
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number.',
      });
    }

    const { rows } = await pool.query(
      `SELECT id, username, full_name, currency
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );

    const employee = rows[0];
    if (!employee) {
      console.warn(`[payment/create-intent:${requestId}] employee not found`, { employeeId });
      return res.status(404).json({
        success: false,
        error: 'Employee not found.',
      });
    }

    const currency = normalizeCurrency(employee.currency || requestedCurrency || 'MAD');
    const stripeAmount = toStripeAmount(parsedAmount, currency);

    if (!stripeAmount || stripeAmount < 1) {
      console.warn(`[payment/create-intent:${requestId}] amount too small`, {
        parsedAmount,
        currency,
        stripeAmount,
      });
      return res.status(400).json({
        success: false,
        error: 'amount is too small for this currency.',
      });
    }

    const safeRating = parseRating(rating);
    console.log(`[payment/create-intent:${requestId}] creating Stripe PaymentIntent`, {
      employeeId: employee.id,
      stripeAmount,
      currency,
      safeRating,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      description: `SnapTip for ${employee.full_name || employee.username || `employee ${employee.id}`}`,
      receipt_email: tourist_email || undefined,
      metadata: {
        employee_id: String(employee.id),
        employee_username: employee.username || '',
        employee_name: employee.full_name || '',
        amount: String(parsedAmount),
        currency,
        tourist_email: tourist_email || '',
        rating: safeRating ? String(safeRating) : '',
      },
    });

    console.log(`[payment/create-intent:${requestId}] created Stripe PaymentIntent`, {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      hasClientSecret: Boolean(paymentIntent.client_secret),
    });

    logFromReq(req, {
      actorType: 'tourist',
      action: 'payment.intent_created',
      targetType: 'employee',
      targetId: Number(employee.id),
      metadata: {
        amount: parsedAmount,
        currency,
        stripe_payment_intent: paymentIntent.id,
      },
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: parsedAmount,
      currency,
    });
  } catch (err) {
    const stripeMessage = err?.raw?.message || err?.message;
    const statusCode = err?.statusCode && err.statusCode >= 400 && err.statusCode < 500
      ? err.statusCode
      : 500;

    console.error(`[payment/create-intent:${requestId}] ERROR:`, {
      message: stripeMessage,
      type: err?.type,
      code: err?.code,
      declineCode: err?.decline_code,
      statusCode,
      stack: err?.stack,
    });

    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500
        ? 'Server error creating payment intent.'
        : stripeMessage || 'Stripe rejected the payment intent request.',
    });
  }
});

router.post('/webhook', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ received: false, error: stripeConfigError });
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ received: false, error: 'Stripe webhook secret is not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('[payment/webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};
      const employeeId = Number(metadata.employee_id);
      const currency = normalizeCurrency(metadata.currency || paymentIntent.currency);
      const amount = Number(metadata.amount) || fromStripeAmount(paymentIntent.amount_received || paymentIntent.amount, currency);
      const touristEmail = metadata.tourist_email || paymentIntent.receipt_email || null;
      const safeRating = parseRating(metadata.rating);

      if (!employeeId || !amount || amount <= 0) {
        console.error('[payment/webhook] Missing employee_id or amount metadata:', paymentIntent.id);
        return res.status(400).json({ received: false, error: 'Missing payment metadata.' });
      }

      const { rows: existingRows } = await pool.query(
        'SELECT id FROM payments WHERE stripe_payment_id = $1 LIMIT 1',
        [paymentIntent.id]
      );

      if (existingRows.length === 0) {
        await processSuccessfulPayment(
          pool,
          employeeId,
          amount,
          'stripe',
          paymentIntent.id,
          touristEmail,
          currency,
          safeRating
        );
      } else {
        console.log(`[payment/webhook] Duplicate Stripe event ignored for ${paymentIntent.id}`);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[payment/webhook] ERROR:', err.message, err.stack);
    return res.status(500).json({ received: false, error: 'Webhook processing failed.' });
  }
});

module.exports = router;
