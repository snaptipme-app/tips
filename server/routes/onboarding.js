const express = require('express');
const authMiddleware = require('../middleware/auth');
const { pool } = require('../db');
const { stripe, stripeConfigError } = require('../lib/stripe');
const { getCountryPayoutConfig, normalizeCountryCode } = require('../lib/countryPayoutConfig');

const router = express.Router();

const DEFAULT_REFRESH_URL = 'https://snaptip.me/onboarding/stripe/refresh';
const DEFAULT_RETURN_URL = 'https://snaptip.me/onboarding/stripe/success';

function publicStripeError() {
  return 'Stripe Connect onboarding is not available right now. Please try again later.';
}

function serializeStripeError(err) {
  const raw = err?.raw && typeof err.raw === 'object' ? { ...err.raw } : null;
  if (raw?.headers) raw.headers = '[redacted]';

  return {
    name: err?.name || null,
    type: err?.type || raw?.type || null,
    code: err?.code || raw?.code || null,
    rawCode: raw?.code || null,
    declineCode: err?.decline_code || raw?.decline_code || null,
    param: err?.param || raw?.param || null,
    docUrl: err?.doc_url || raw?.doc_url || null,
    statusCode: err?.statusCode || raw?.statusCode || null,
    requestId: err?.requestId || raw?.requestId || raw?.request_id || null,
    requestLogUrl: err?.request_log_url || raw?.request_log_url || null,
    message: err?.message || raw?.message || null,
    raw,
  };
}

function getStripeOnboardingErrorResponse(err) {
  const message = String(err?.message || err?.raw?.message || '').toLowerCase();
  const isPlatformSetupIssue = [
    "signed up for connect",
    'responsibilities of managing losses',
    'platform needs approval',
    'request transfers without card_payments',
  ].some((needle) => message.includes(needle));

  if (isPlatformSetupIssue) {
    return {
      status: 503,
      body: {
        error: 'Stripe Connect onboarding is waiting on Stripe platform approval. Please try again later.',
        code: 'stripe_connect_platform_setup_required',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: publicStripeError(),
      code: 'stripe_connect_onboarding_unavailable',
    },
  };
}

router.post('/stripe-connect', authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: stripeConfigError || publicStripeError() });
    }

    const countryCode = normalizeCountryCode(req.body?.countryCode);
    const config = getCountryPayoutConfig(countryCode);

    if (!config) {
      return res.status(400).json({ error: 'Payouts are not available for this country yet.' });
    }
    if (config.status === 'review_needed' || config.payoutMethod !== 'stripe_connect' || !config.autoPayouts) {
      return res.status(400).json({
        error: config.payoutMethod === 'review_needed'
          ? 'Automatic payouts are not available for this country yet. You can continue with manual payout review.'
          : 'This country uses manual payout review instead of Stripe Connect.',
      });
    }

    const employeeId = req.employee.id;
    const { rows } = await pool.query(
      `SELECT id, email, stripe_account_id
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    const employee = rows[0];
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    let stripeAccountId = employee.stripe_account_id;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: config.code,
        email: employee.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          employee_id: String(employeeId),
        },
      });
      stripeAccountId = account.id;

      await pool.query(
        `UPDATE employees
         SET stripe_account_id = $1,
             payout_method = $2,
             payout_country = $3,
             payout_onboarding_status = $4
         WHERE id = $5`,
        [stripeAccountId, 'stripe_connect', config.code, 'started', employeeId]
      );
    } else {
      await pool.query(
        `UPDATE employees
         SET payout_method = $1,
             payout_country = $2,
             payout_onboarding_status = COALESCE(payout_onboarding_status, $3)
         WHERE id = $4`,
        ['stripe_connect', config.code, 'started', employeeId]
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL || DEFAULT_REFRESH_URL,
      return_url: process.env.STRIPE_CONNECT_RETURN_URL || DEFAULT_RETURN_URL,
      type: 'account_onboarding',
    });

    return res.json({
      url: accountLink.url,
      stripeAccountId,
    });
  } catch (err) {
    const details = serializeStripeError(err);
    console.error('[onboarding/stripe-connect] Stripe error detail', JSON.stringify(details, null, 2));
    const response = getStripeOnboardingErrorResponse(err);
    return res.status(response.status).json(response.body);
  }
});

router.get('/stripe-connect/status', authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: stripeConfigError || publicStripeError() });
    }

    const employeeId = req.employee.id;
    const { rows } = await pool.query(
      'SELECT stripe_account_id FROM employees WHERE id = $1',
      [employeeId]
    );
    const stripeAccountId = rows[0]?.stripe_account_id;

    if (!stripeAccountId) {
      return res.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsCurrentlyDue: [],
      });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const detailsSubmitted = Boolean(account.details_submitted);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const chargesEnabled = Boolean(account.charges_enabled);
    const requirementsCurrentlyDue = account.requirements?.currently_due || [];

    await pool.query(
      `UPDATE employees
       SET payout_onboarding_status = $1
       WHERE id = $2`,
      [detailsSubmitted || payoutsEnabled ? 'submitted' : 'started', employeeId]
    );

    return res.json({
      connected: detailsSubmitted || payoutsEnabled,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      requirementsCurrentlyDue,
    });
  } catch (err) {
    const details = serializeStripeError(err);
    console.error('[onboarding/stripe-connect/status] Stripe error detail', JSON.stringify(details, null, 2));
    return res.status(500).json({ error: 'Could not check onboarding status. Please try again later.' });
  }
});

module.exports = router;
