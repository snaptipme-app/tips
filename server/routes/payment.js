const express = require('express');
const { pool } = require('../db');
const { stripe, stripeConfigError } = require('../lib/stripe');
const { processSuccessfulPayment } = require('../lib/processPayment');
const { logFromReq } = require('../lib/audit');
const {
  getEffectivePayoutConfig,
  getEffectivePayoutMethod,
} = require('../lib/countryPayoutConfig');
const {
  getStripePaymentCurrency,
  toStripeMinorUnit,
  fromStripeMinorUnit,
} = require('../lib/stripeCurrency');

const router = express.Router();

const LOCAL_TO_USD_RATE = 10;

function normalizeCurrency(currency) {
  return String(currency || 'MAD').trim().toUpperCase();
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
      `SELECT id, username, full_name, country, currency, payout_method
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

    const originalCurrency = normalizeCurrency(employee.currency || requestedCurrency || 'MAD');
    const originalAmount = parsedAmount;
    const payoutConfig = getEffectivePayoutConfig({
      countryName: employee.country,
      currency: employee.currency || originalCurrency,
    });
    const storedPayoutMethod = ['stripe_connect', 'wise_manual'].includes(employee.payout_method)
      ? employee.payout_method
      : null;
    const payoutMethod = storedPayoutMethod || getEffectivePayoutMethod(payoutConfig);
    const stripePaymentCurrency = payoutMethod === 'stripe_connect'
      ? getStripePaymentCurrency(payoutConfig.code)
      : 'USD';
    const stripePaymentMajorAmount = payoutMethod === 'stripe_connect'
      ? originalAmount
      : originalAmount / LOCAL_TO_USD_RATE;
    const stripePaymentAmount = toStripeMinorUnit(stripePaymentMajorAmount, stripePaymentCurrency);
    const exchangeRateUsed = payoutMethod === 'stripe_connect' ? 1 : LOCAL_TO_USD_RATE;

    if (!stripePaymentAmount || stripePaymentAmount < 1) {
      console.warn(`[payment/create-intent:${requestId}] amount too small`, {
        originalAmount,
        originalCurrency,
        stripePaymentCurrency,
        stripePaymentAmount,
      });
      return res.status(400).json({
        success: false,
        error: 'amount is too small for this currency.',
      });
    }

    const safeRating = parseRating(rating);
    console.log(`[payment/create-intent:${requestId}] creating Stripe PaymentIntent`, {
      employeeId: employee.id,
      stripePaymentAmount,
      stripePaymentCurrency,
      originalAmount,
      originalCurrency,
      payoutMethod,
      safeRating,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripePaymentAmount,
      currency: stripePaymentCurrency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      description: `SnapTip for ${employee.full_name || employee.username || `employee ${employee.id}`}`,
      receipt_email: tourist_email || undefined,
      metadata: {
        employee_id: String(employee.id),
        employee_username: employee.username || '',
        employee_name: employee.full_name || '',
        original_amount: String(originalAmount),
        original_currency: originalCurrency,
        amount: String(originalAmount),
        currency: originalCurrency,
        stripe_payment_currency: stripePaymentCurrency,
        stripe_payment_amount: String(stripePaymentAmount),
        exchange_rate_used: String(exchangeRateUsed),
        employee_balance_currency: originalCurrency,
        payout_method: payoutMethod,
        stripe_amount_usd: stripePaymentCurrency === 'USD'
          ? String(fromStripeMinorUnit(stripePaymentAmount, stripePaymentCurrency))
          : '',
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
        amount: originalAmount,
        currency: originalCurrency,
        stripe_payment_amount: stripePaymentAmount,
        stripe_payment_currency: stripePaymentCurrency,
        exchange_rate_used: exchangeRateUsed,
        stripe_payment_intent: paymentIntent.id,
      },
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: originalAmount,
      currency: originalCurrency,
      stripePaymentAmount,
      stripePaymentCurrency,
      exchangeRateUsed,
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

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('[webhook] received event');

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
    console.log('[payment/webhook] Signature verified:', event.type);
  } catch (err) {
    console.error('[payment/webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};
      const employeeId = Number(metadata.employee_id);
      const currency = normalizeCurrency(metadata.employee_balance_currency || metadata.original_currency || metadata.currency || paymentIntent.currency);
      const amount = Number(metadata.original_amount || metadata.amount)
        || fromStripeMinorUnit(paymentIntent.amount_received || paymentIntent.amount, currency);
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
          safeRating,
          {
            originalAmount: amount,
            originalCurrency: currency,
            stripePaymentCurrency: normalizeCurrency(metadata.stripe_payment_currency || paymentIntent.currency),
            stripePaymentAmount: Number(metadata.stripe_payment_amount || paymentIntent.amount_received || paymentIntent.amount),
            exchangeRateUsed: Number(metadata.exchange_rate_used || 1),
            employeeBalanceCurrency: currency,
          }
        );

        const { rows: balanceRows } = await pool.query(
          'SELECT balance, total_tips FROM employees WHERE id = $1',
          [employeeId]
        );
        console.log('[payment/webhook] Employee balance updated', {
          employeeId,
          grossAmount: amount,
          currency,
          balance: balanceRows[0]?.balance,
          totalTips: balanceRows[0]?.total_tips,
          stripePaymentIntent: paymentIntent.id,
        });
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
