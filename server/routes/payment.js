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
  toStripeMinorUnit,
  fromStripeMinorUnit,
} = require('../lib/stripeCurrency');
const { getStripeSettlementDetails } = require('../lib/stripeSettlementLedger');
const {
  convertLocalAmountToUsd,
  normalizeCurrency,
} = require('../lib/exchangeRates');

const router = express.Router();
const DEMO_EMPLOYEE_EMAIL = 'snaptip.me@gmail.com';

function parseRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function parseStripeEventAccount(rawBody) {
  try {
    const parsed = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || ''));
    return parsed?.account || null;
  } catch (_) {
    return null;
  }
}

function constructStripeWebhookEvent(rawBody, signature) {
  const mainSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const hasConnectAccount = Boolean(parseStripeEventAccount(rawBody));
  const candidates = hasConnectAccount
    ? [
        { name: 'connect', secret: connectSecret },
        { name: 'main', secret: mainSecret },
      ]
    : [
        { name: 'main', secret: mainSecret },
        { name: 'connect', secret: connectSecret },
      ];

  let lastError = null;
  for (const candidate of candidates) {
    if (!candidate.secret) continue;
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, candidate.secret);
      return { event, source: candidate.name };
    } catch (err) {
      lastError = err;
    }
  }

  if (!mainSecret && !connectSecret) {
    throw new Error('Stripe webhook secrets are not configured.');
  }
  throw lastError || new Error('Stripe webhook signature verification failed.');
}

router.post('/create-intent', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
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
      `SELECT id, username, full_name, email, country, currency, payout_method
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

    if (String(employee.email || '').trim().toLowerCase() === DEMO_EMPLOYEE_EMAIL) {
      console.log(`[payment/create-intent:${requestId}] demo employee detected; Stripe skipped`, {
        employeeId: employee.id,
        amount: parsedAmount,
        currency: requestedCurrency || employee.currency,
      });
      return res.json({ isDemo: true });
    }

    if (!stripe) {
      console.error(`[payment/create-intent:${requestId}] Stripe unavailable: ${stripeConfigError}`);
      return res.status(503).json({
        success: false,
        error: stripeConfigError,
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
    const stripePaymentCurrency = 'USD';
    const conversion = await convertLocalAmountToUsd(originalAmount, originalCurrency);
    const stripePaymentMajorAmount = conversion.usdAmount;
    const stripePaymentAmount = toStripeMinorUnit(stripePaymentMajorAmount, stripePaymentCurrency);
    const exchangeRateUsed = conversion.exchangeRate;
    const usdAmount = fromStripeMinorUnit(stripePaymentAmount, stripePaymentCurrency);

    console.log(
      `Converted ${originalAmount} ${originalCurrency} to ${stripePaymentAmount} USD cents using rate ${exchangeRateUsed}`
    );

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
      currency: 'usd',
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
        usd_amount: String(usdAmount),
        employee_balance_currency: originalCurrency,
        payout_method: payoutMethod,
        stripe_amount_usd: stripePaymentCurrency === 'USD'
          ? String(usdAmount)
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
        usd_amount: usdAmount,
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
      usdAmount,
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

router.post('/mock-success', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const {
      amount,
      currency: requestedCurrency,
      employeeId: employeeIdCamel,
      employee_id: employeeIdSnake,
      tourist_email = null,
      rating = null,
    } = req.body;
    const employeeId = employeeIdCamel || employeeIdSnake;

    if (!employeeId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'employeeId and amount are required.',
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number.',
      });
    }

    const { rows } = await pool.query(
      `SELECT id, username, full_name, email, country, currency, payout_method
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    const employee = rows[0];

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found.',
      });
    }

    if (String(employee.email || '').trim().toLowerCase() !== DEMO_EMPLOYEE_EMAIL) {
      console.warn(`[payment/mock-success:${requestId}] rejected non-demo employee`, { employeeId });
      return res.status(403).json({
        success: false,
        error: 'Mock payments are only available for the demo account.',
      });
    }

    const originalCurrency = normalizeCurrency(employee.currency || requestedCurrency || 'MAD');
    const safeRating = parseRating(rating);
    const transactionId = `demo_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const payment = await processSuccessfulPayment(
      pool,
      employee.id,
      parsedAmount,
      'mock',
      transactionId,
      tourist_email,
      originalCurrency,
      safeRating,
      {
        originalAmount: parsedAmount,
        originalCurrency,
        employeeBalanceCurrency: originalCurrency,
        settlementStatus: 'available',
        amountAvailableForEmployee: parsedAmount,
        isDemo: true,
      }
    );

    console.log(`[payment/mock-success:${requestId}] demo payment recorded`, {
      paymentId: payment?.id,
      employeeId: employee.id,
      amount: parsedAmount,
      currency: originalCurrency,
      isDemo: true,
    });

    return res.json({
      success: true,
      isDemo: true,
      paymentId: payment?.id || null,
      amount: parsedAmount,
      currency: originalCurrency,
    });
  } catch (err) {
    console.error(`[payment/mock-success:${requestId}] ERROR:`, err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: 'Server error recording demo payment.',
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('[webhook] received event');

  if (!stripe) {
    return res.status(503).json({ received: false, error: stripeConfigError });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Webhook Error: Missing Stripe signature.');
  }

  let event;
  try {
    const verified = constructStripeWebhookEvent(req.body, signature);
    event = verified.event;
    console.log('[payment/webhook] Signature verified:', {
      type: event.type,
      source: verified.source,
      account: event.account || null,
    });
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
      const stripePaymentCurrency = normalizeCurrency(metadata.stripe_payment_currency || paymentIntent.currency || 'USD');
      const stripePaymentAmount = Number(paymentIntent.amount_received || paymentIntent.amount || metadata.stripe_payment_amount || 0);
      const metadataUsdAmount = Number(metadata.usd_amount || metadata.stripe_amount_usd);
      const usdAmount = stripePaymentCurrency === 'USD'
        ? fromStripeMinorUnit(stripePaymentAmount, stripePaymentCurrency)
        : Number.isFinite(metadataUsdAmount) && metadataUsdAmount > 0
          ? metadataUsdAmount
          : null;
      const exchangeRateUsed = Number(metadata.exchange_rate_used || 1);

      if (!employeeId || !amount || amount <= 0) {
        console.error('[payment/webhook] Missing employee_id or amount metadata:', paymentIntent.id);
        return res.status(400).json({ received: false, error: 'Missing payment metadata.' });
      }

      const { rows: existingRows } = await pool.query(
        'SELECT id FROM payments WHERE stripe_payment_id = $1 LIMIT 1',
        [paymentIntent.id]
      );

      if (existingRows.length === 0) {
        let settlementDetails;
        try {
          settlementDetails = await getStripeSettlementDetails(paymentIntent);
        } catch (settlementErr) {
          settlementDetails = {
            stripeChargeId: typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id || null,
            stripeBalanceTransactionId: null,
            stripeFeeAmount: null,
            netPlatformReceivedAmount: null,
            availableOn: null,
            settlementStatus: 'pending',
          };
          console.warn('[payment/webhook] Could not retrieve Stripe settlement details', {
            paymentIntentId: paymentIntent.id,
            message: settlementErr?.message,
            code: settlementErr?.code,
          });
        }
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
            stripePaymentCurrency,
            stripePaymentAmount,
            exchangeRateUsed,
            usdAmount,
            employeeBalanceCurrency: currency,
            stripeChargeId: settlementDetails.stripeChargeId,
            stripeBalanceTransactionId: settlementDetails.stripeBalanceTransactionId,
            stripeFeeAmount: settlementDetails.stripeFeeAmount,
            netPlatformReceivedAmount: settlementDetails.netPlatformReceivedAmount,
            settlementStatus: settlementDetails.settlementStatus,
            availableOn: settlementDetails.availableOn,
            amountAvailableForEmployee: amount,
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
          settlementStatus: settlementDetails.settlementStatus,
          availableOn: settlementDetails.availableOn,
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
