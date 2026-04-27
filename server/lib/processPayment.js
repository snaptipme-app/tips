const https = require('https');

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
 * @param {string}  currency      - Currency code (e.g. 'MAD', 'EUR', 'USD', 'AED')
 * @returns {object} The created payment object
 */
async function processSuccessfulPayment(pool, employeeId, amount, method, transactionId, touristEmail, currency = 'MAD') {
  console.log(`[DEBUG processPayment] employeeId=${employeeId} amount=${amount} currency=${currency} method=${method}`);

  // 1. Insert payment record (with currency for full traceability)
  const { rows: paymentRows } = await pool.query(
    `INSERT INTO payments (employee_id, amount, payment_method, status, stripe_payment_id, tourist_email, currency)
     VALUES ($1, $2, $3, 'completed', $4, $5, $6) RETURNING *`,
    [employeeId, amount, method, transactionId || null, touristEmail || null, currency]
  );
  const payment = paymentRows[0];
  console.log(`[DEBUG processPayment] Payment inserted: id=${payment?.id}, currency=${payment?.currency}`);

  // 2. Update employee balance and total_tips
  await pool.query(
    'UPDATE employees SET balance = balance + $1, total_tips = total_tips + $1 WHERE id = $2',
    [amount, employeeId]
  );

  // 3. Insert into tips table (keeps existing dashboard/analytics working)
  await pool.query(
    "INSERT INTO tips (employee_id, amount, status) VALUES ($1, $2, 'completed')",
    [employeeId, amount]
  );

  // 4. Send push notification (fire-and-forget — never blocks payment flow)
  try {
    const { rows: empRows } = await pool.query(
      'SELECT push_token, currency FROM employees WHERE id = $1',
      [employeeId]
    );
    const emp = empRows[0];
    if (emp?.push_token) {
      const notifCurrency = emp.currency || currency;
      sendExpoPush(
        emp.push_token,
        'New Tip Received! 💰',
        `You received ${amount} ${notifCurrency}!`,
        { type: 'tip', amount, currency: notifCurrency }
      );
      console.log(`[push] Notification queued for employee_id=${employeeId} amount=${amount} ${notifCurrency}`);
    } else {
      console.log(`[push] No push_token for employee_id=${employeeId} — skipping notification`);
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
