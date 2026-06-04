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
const { getStripeSettlementDetails } = require('../lib/stripeSettlementLedger');

const router = express.Router();

const EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';
const EXCHANGE_RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_USD_RATES = {
  MAD: 10,
  AED: 3.67,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.34,
  JPY: 149,
  HKD: 7.82,
  CHF: 0.90,
  NOK: 10.5,
  DKK: 6.9,
  SEK: 10.4,
  PLN: 4.0,
  NZD: 1.63,
  THB: 35,
  PHP: 56,
  IDR: 15600,
};

let exchangeRateCache = {
  fetchedAt: 0,
  rates: null,
};

function normalizeCurrency(currency) {
  return String(currency || 'MAD').trim().toUpperCase();
}

async function getUsdExchangeRates() {
  const now = Date.now();
  if (
    exchangeRateCache.rates &&
    now - exchangeRateCache.fetchedAt < EXCHANGE_RATE_CACHE_TTL_MS
  ) {
    return exchangeRateCache.rates;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API_URL);
    if (!response.ok) {
      throw new Error(`Exchange rate API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data?.result !== 'success' || !data?.rates || typeof data.rates !== 'object') {
      throw new Error('Exchange rate API returned an invalid payload');
    }

    exchangeRateCache = {
      fetchedAt: now,
      rates: data.rates,
    };
    return data.rates;
  } catch (err) {
    console.warn('[payment] exchange rate API unavailable, using fallback rates', {
      message: err?.message,
    });
    exchangeRateCache = {
      fetchedAt: now,
      rates: FALLBACK_USD_RATES,
    };
    return FALLBACK_USD_RATES;
  }
}

async function convertLocalAmountToUsd(amount, currency) {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === 'USD') {
    return {
      usdAmount: amount,
      exchangeRate: 1,
    };
  }

  const rates = await getUsdExchangeRates();
  const exchangeRate = Number(rates[normalizedCurrency]);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error(`No USD exchange rate available for ${normalizedCurrency}`);
  }

  return {
    usdAmount: amount / exchangeRate,
    exchangeRate,
  };
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
    const conversion = payoutMethod === 'stripe_connect'
      ? { usdAmount: originalAmount, exchangeRate: 1 }
      : await convertLocalAmountToUsd(originalAmount, originalCurrency);
    const stripePaymentMajorAmount = payoutMethod === 'stripe_connect'
      ? originalAmount
      : conversion.usdAmount;
    const stripePaymentAmount = toStripeMinorUnit(stripePaymentMajorAmount, stripePaymentCurrency);
    const exchangeRateUsed = conversion.exchangeRate;

    if (stripePaymentCurrency === 'USD') {
      console.log(
        `[payment] converting ${originalAmount} ${originalCurrency} → ${stripePaymentMajorAmount.toFixed(2)} USD at rate ${exchangeRateUsed}`
      );
    }

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
            stripePaymentCurrency: normalizeCurrency(metadata.stripe_payment_currency || paymentIntent.currency),
            stripePaymentAmount: Number(metadata.stripe_payment_amount || paymentIntent.amount_received || paymentIntent.amount),
            exchangeRateUsed: Number(metadata.exchange_rate_used || 1),
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
