const https = require('https');
const {
  sendEmail,
  buildPaymentConfirmationEmail,
  buildTipReceivedEmail,
} = require('../utils/sendEmail');
const { parseMoneyToMinor, minorToMoneyString } = require('./money');
const {
  getEffectivePayoutConfig,
  getEffectivePayoutMethod,
} = require('./countryPayoutConfig');

/**
 * Sends an Expo push notification without adding any npm dependency.
 * Fire-and-forget: errors are logged but never propagate to the caller.
 */
function sendExpoPush(pushToken, title, body, data) {
  const payload = JSON.stringify({
    to: pushToken,
    title,
    body,
    // channelId routes to our 'tips' Android channel (which defines the custom sound)
    channelId: 'tips',
    // 'default' on iOS plays the system sound; Android uses the channel sound
    sound: 'default',
    priority: 'high',
    data: data || {},
  });

  const req = https.request(
    {
      hostname: 'exp.host',
      port: 443,
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        console.log(`[push] Expo response status=${res.statusCode} body=${responseBody.slice(0, 200)}`);
      });
    }
  );

  req.on('error', (err) => {
    console.error('[push] Expo API request error:', err.message);
  });

  req.write(payload);
  req.end();
}

/**
 * processSuccessfulPayment - Core payment processing function
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
 * @param {string}  currency      - Currency code (e.g. 'MAD', 'EUR', 'USD', 'AED')
 * @returns {object} The created payment object
 */
async function processSuccessfulPayment(pool, employeeId, amount, method, transactionId, touristEmail, currency = 'MAD', rating = null, options = {}) {
  console.log(`[DEBUG processPayment] employeeId=${employeeId} amount=${amount} currency=${currency} method=${method} rating=${rating}`);

  const safeRating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
  const grossMinor = parseMoneyToMinor(amount);
  if (!grossMinor) {
    throw new Error('Invalid payment amount.');
  }
  const grossAmount = minorToMoneyString(grossMinor);
  const zeroAmount = '0.00';

  if (transactionId) {
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM payments WHERE stripe_payment_id = $1 LIMIT 1',
      [transactionId]
    );
    if (existingRows.length > 0) {
      console.log(`[DEBUG processPayment] Duplicate transaction ignored: ${transactionId}`);
      return existingRows[0];
    }
  }

  const { rows: employeeRows } = await pool.query(
    `SELECT id, business_id, country, currency, payout_method
     FROM employees
     WHERE id = $1`,
    [employeeId]
  );
  const employee = employeeRows[0];
  const payoutConfig = getEffectivePayoutConfig({
    countryName: employee?.country,
    currency: employee?.currency || currency,
  });
  const storedPayoutMethod = ['stripe_connect', 'wise_manual'].includes(employee?.payout_method)
    ? employee.payout_method
    : null;
  const payoutMethod = storedPayoutMethod || getEffectivePayoutMethod(payoutConfig);
  const originalAmount = options.originalAmount || amount;
  const originalCurrency = options.originalCurrency || currency;
  const stripePaymentCurrency = options.stripePaymentCurrency || null;
  const stripePaymentAmount = options.stripePaymentAmount || null;
  const exchangeRateUsed = options.exchangeRateUsed || null;
  const usdAmount = options.usdAmount ?? null;
  const employeeBalanceCurrency = options.employeeBalanceCurrency || currency;
  const stripeChargeId = options.stripeChargeId || null;
  const stripeBalanceTransactionId = options.stripeBalanceTransactionId || null;
  const stripeFeeAmount = options.stripeFeeAmount ?? null;
  const netPlatformReceivedAmount = options.netPlatformReceivedAmount ?? null;
  const availableOn = options.availableOn || null;
  const settlementStatus = ['pending', 'available'].includes(options.settlementStatus)
    ? options.settlementStatus
    : method === 'stripe'
      ? 'pending'
      : 'available';
  const amountAvailableForEmployee = options.amountAvailableForEmployee || grossAmount;
  const isDemo = options.isDemo === true || options.isDemo === 1 ? 1 : 0;
  /* Stripe's fee, paid by the guest on top of the tip. Never touches the
     employee's balance or SnapTip's margin - it exists only so the guest's
     receipt matches their card statement. */
  const guestProcessingFee = Number(options.processingFee) > 0 ? Number(options.processingFee) : 0;
  const guestTotalCharged = Number(options.totalCharged) > 0
    ? Number(options.totalCharged)
    : Number(grossAmount) + guestProcessingFee;

  // 1. Insert gross payment record. SnapTip commission is calculated later, at withdrawal time.
  const { rows: paymentRows } = await pool.query(
    `INSERT INTO payments (
       employee_id, business_id, amount, gross_amount, platform_fee_amount,
       platform_fee_percent, net_amount, currency, original_currency, original_amount,
       stripe_payment_currency, stripe_payment_amount, exchange_rate_used, usd_amount, employee_balance_currency,
       payment_method, status, stripe_payment_id, stripe_payment_intent_id, stripe_charge_id,
       stripe_balance_transaction_id, stripe_fee_amount, net_platform_received_amount,
       settlement_status, available_on, amount_available_for_employee,
       tourist_email, rating, payout_method, fee, is_demo
     )
     VALUES (
       $1, $2, $3::real, $4::numeric, $5::numeric,
       $6::numeric, $7::numeric, $8, $9, $10::numeric,
       $11, $12::numeric, $13::numeric, $14::numeric, $15,
       $16, 'completed', $17, $17, $18,
       $19, $20::numeric, $21::numeric,
       $22, $23::timestamp, $24::numeric,
       $25, $26, $27, $28::real, $29::integer
     ) RETURNING *`,
    [
      employeeId,
      employee?.business_id || null,
      grossAmount,
      grossAmount,
      zeroAmount,
      0,
      grossAmount,
      currency,
      originalCurrency,
      originalAmount,
      stripePaymentCurrency,
      stripePaymentAmount,
      exchangeRateUsed,
      usdAmount,
      employeeBalanceCurrency,
      method,
      transactionId || null,
      stripeChargeId,
      stripeBalanceTransactionId,
      stripeFeeAmount,
      netPlatformReceivedAmount,
      settlementStatus,
      availableOn,
      amountAvailableForEmployee,
      touristEmail || null,
      safeRating,
      payoutMethod,
      Number(zeroAmount),
      isDemo,
    ]
  );
  const payment = paymentRows[0];
  console.log(`[DEBUG processPayment] Payment inserted: id=${payment?.id}, gross=${grossAmount}, currency=${payment?.currency}`);

  // 2. Update employee balance by the full gross tip. SnapTip fee is taken on withdrawal.
  await pool.query(
    `UPDATE employees
     SET balance = ROUND((COALESCE(balance, 0)::numeric + $1::numeric), 2)::real,
         total_tips = ROUND((COALESCE(total_tips, 0)::numeric + $1::numeric), 2)::real
     WHERE id = $2`,
    [grossAmount, employeeId]
  );

  // 3. Insert gross tip into tips table (keeps existing dashboard/analytics working)
  await pool.query(
    "INSERT INTO tips (employee_id, amount, status, rating, is_demo) VALUES ($1, $2, 'completed', $3, $4)",
    [employeeId, Number(grossAmount), safeRating, isDemo]
  );
  // Ensure rating column exists (idempotent - only runs if column is missing)
  pool.query(
    'ALTER TABLE tips ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5)'
  ).catch(() => {});
  pool.query('ALTER TABLE tips ADD COLUMN IF NOT EXISTS is_demo INTEGER DEFAULT 0').catch(() => {});

  // 4. Send push notification + emails (fire-and-forget - never blocks payment flow)
  try {
    const { rows: empRows } = await pool.query(
      `SELECT e.push_token, e.currency, e.full_name, e.email, b.business_name
       FROM employees e
       LEFT JOIN businesses b ON b.id = e.business_id
       WHERE e.id = $1`,
      [employeeId]
    );
    const emp = empRows[0];
    if (emp?.push_token) {
      const notifCurrency = emp.currency || currency;
      sendExpoPush(
        emp.push_token,
        'New Tip Received! 💰',
        `You received ${grossAmount} ${notifCurrency}.`,
        {
          type: 'tip',
          amount: Number(grossAmount),
          grossAmount: Number(grossAmount),
          platformFeeAmount: 0,
          currency: notifCurrency,
        }
      );
      console.log(`[push] Notification queued for employee_id=${employeeId} gross=${grossAmount} ${notifCurrency}`);
    } else {
      console.log(`[push] No push_token for employee_id=${employeeId} - skipping notification`);
    }

    // 4a. Email the employee that they received a tip.
    if (emp?.email) {
      sendEmail(
        emp.email,
        `You received a tip - ${Number(grossAmount).toFixed(2)} ${currency}`,
        buildTipReceivedEmail({
          amount: Number(grossAmount),
          currency,
          dashboardUrl: 'https://snaptip.me',
        })
      ).catch((err) => console.error('[email] Tip-received email failed:', err.message));
    }

    // 4b. Email the tourist a payment receipt (only if they provided an email).
    if (touristEmail) {
      sendEmail(
        touristEmail,
        `Your SnapTip receipt - ${Number(grossAmount).toFixed(2)} ${currency}`,
        buildPaymentConfirmationEmail({
          amount: Number(grossAmount),
          currency,
          employeeName: emp?.full_name || null,
          businessName: emp?.business_name || null,
          transactionId: transactionId || (payment?.id ? `SNAP-${payment.id}` : null),
          date: payment?.created_at || new Date(),
          processingFee: guestProcessingFee,
          totalAmount: guestTotalCharged,
        })
      ).catch((err) => console.error('[email] Payment-confirmation email failed:', err.message));
    }
  } catch (pushErr) {
    console.error('[push] Failed to send notification (payment still succeeded):', pushErr.message);
  }

  if (!payment) {
    return { id: null, employee_id: employeeId, amount, method, status: 'completed' };
  }

  return payment;
}

module.exports = { processSuccessfulPayment };
