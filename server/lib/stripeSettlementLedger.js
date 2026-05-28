const { stripe } = require('./stripe');
const { normalizeCurrency } = require('./money');
const { fromStripeMinorUnit } = require('./stripeCurrency');

async function getStripeSettlementDetails(paymentIntentOrId) {
  const details = {
    stripeChargeId: null,
    stripeBalanceTransactionId: null,
    stripeFeeAmount: null,
    netPlatformReceivedAmount: null,
    availableOn: null,
    settlementStatus: 'pending',
  };

  if (!stripe) return details;

  const paymentIntent = typeof paymentIntentOrId === 'string'
    ? await stripe.paymentIntents.retrieve(paymentIntentOrId)
    : paymentIntentOrId;

  const latestChargeId = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id;
  if (!latestChargeId) return details;

  details.stripeChargeId = latestChargeId;

  const charge = await stripe.charges.retrieve(latestChargeId, {
    expand: ['balance_transaction'],
  });
  const balanceTransaction = charge?.balance_transaction;
  const balanceTransactionId = typeof balanceTransaction === 'string'
    ? balanceTransaction
    : balanceTransaction?.id;
  details.stripeBalanceTransactionId = balanceTransactionId || null;

  const balanceData = typeof balanceTransaction === 'object' && balanceTransaction
    ? balanceTransaction
    : balanceTransactionId
      ? await stripe.balanceTransactions.retrieve(balanceTransactionId)
      : null;

  if (balanceData) {
    const balanceCurrency = normalizeCurrency(balanceData.currency || paymentIntent.currency);
    details.stripeFeeAmount = fromStripeMinorUnit(balanceData.fee || 0, balanceCurrency);
    details.netPlatformReceivedAmount = fromStripeMinorUnit(balanceData.net || 0, balanceCurrency);
    if (balanceData.available_on) {
      details.availableOn = new Date(Number(balanceData.available_on) * 1000).toISOString();
      details.settlementStatus = Number(balanceData.available_on) <= Math.floor(Date.now() / 1000)
        ? 'available'
        : 'pending';
    }
  }

  return details;
}

async function backfillPaymentSettlementRows(pool, { employeeId = null, limit = 25 } = {}) {
  if (!stripe) {
    return { checked: 0, updated: 0, skipped: 0, failed: 0 };
  }

  const params = [];
  let employeeFilter = '';
  if (employeeId) {
    params.push(employeeId);
    employeeFilter = `AND employee_id = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT id, employee_id, amount, gross_amount, currency, employee_balance_currency,
            stripe_payment_id, stripe_payment_intent_id
     FROM payments
     WHERE status = 'completed'
       ${employeeFilter}
       AND COALESCE(stripe_payment_intent_id, stripe_payment_id) LIKE 'pi_%'
       AND (
         stripe_charge_id IS NULL
         OR stripe_balance_transaction_id IS NULL
         OR available_on IS NULL
         OR amount_available_for_employee IS NULL
       )
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  const summary = { checked: rows.length, updated: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    const paymentIntentId = row.stripe_payment_intent_id || row.stripe_payment_id;
    try {
      const details = await getStripeSettlementDetails(paymentIntentId);
      if (!details.stripeChargeId && !details.stripeBalanceTransactionId && !details.availableOn) {
        summary.skipped += 1;
        continue;
      }

      await pool.query(
        `UPDATE payments
         SET stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $1),
             stripe_charge_id = COALESCE($2, stripe_charge_id),
             stripe_balance_transaction_id = COALESCE($3, stripe_balance_transaction_id),
             stripe_fee_amount = COALESCE($4::numeric, stripe_fee_amount),
             net_platform_received_amount = COALESCE($5::numeric, net_platform_received_amount),
             available_on = COALESCE($6::timestamp, available_on),
             settlement_status = CASE
               WHEN $6::timestamp IS NOT NULL AND $6::timestamp <= NOW() THEN 'available'
               WHEN $6::timestamp IS NOT NULL THEN 'pending'
               ELSE COALESCE(settlement_status, 'pending')
             END,
             gross_amount = COALESCE(gross_amount, amount),
             original_amount = COALESCE(original_amount, gross_amount, amount),
             original_currency = COALESCE(original_currency, currency),
             employee_balance_currency = COALESCE(employee_balance_currency, currency),
             amount_available_for_employee = COALESCE(amount_available_for_employee, gross_amount, amount)
         WHERE id = $7`,
        [
          paymentIntentId,
          details.stripeChargeId,
          details.stripeBalanceTransactionId,
          details.stripeFeeAmount,
          details.netPlatformReceivedAmount,
          details.availableOn,
          row.id,
        ]
      );
      summary.updated += 1;
    } catch (err) {
      summary.failed += 1;
      console.warn('[stripe-settlement-backfill] skipped payment row', {
        paymentId: row.id,
        employeeId: row.employee_id,
        paymentIntentId,
        message: err?.message,
        code: err?.code,
      });
    }
  }

  return summary;
}

module.exports = {
  backfillPaymentSettlementRows,
  getStripeSettlementDetails,
};
