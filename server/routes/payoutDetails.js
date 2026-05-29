const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { getEncryptionKey } = require('../lib/cryptoFields');
const {
  getEffectivePayoutConfig,
  getEffectivePayoutMethod,
} = require('../lib/countryPayoutConfig');
const {
  getWiseManualDetailsConfig,
  validateWisePayoutDetails,
  getDetailsLast4,
  serializeMaskedPayoutDetails,
} = require('../lib/wisePayoutDetails');

function decryptedColumn(column, keyParam = 2, alias = 'epd') {
  return `CASE WHEN ${alias}.${column} IS NOT NULL THEN pgp_sym_decrypt(${alias}.${column}, $${keyParam}) ELSE NULL END`;
}

async function getEmployeePayoutContext(employeeId) {
  const { rows } = await pool.query(
    `SELECT id, country, currency, payout_method
     FROM employees
     WHERE id = $1`,
    [employeeId]
  );
  const employee = rows[0];
  if (!employee) return null;
  const payoutCfg = getEffectivePayoutConfig({
    countryName: employee.country,
    currency: employee.currency,
  });
  return {
    employee,
    payoutCfg,
    payoutMethod: getEffectivePayoutMethod(payoutCfg),
  };
}

async function fetchPayoutDetails(employeeId, encKey) {
  if (!encKey) {
    const { rows } = await pool.query(
      `SELECT id, payout_method, country_code, currency, account_holder_name,
              account_holder_name_en, bank_name, details_last4, is_confirmed,
              created_at, updated_at
       FROM employee_payout_details
       WHERE employee_id = $1`,
      [employeeId]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `SELECT id, payout_method, country_code, currency, account_holder_name,
            account_holder_name_en, bank_name, details_last4, is_confirmed,
            created_at, updated_at,
            ${decryptedColumn('rib_number_encrypted')} AS rib_number,
            ${decryptedColumn('iban_encrypted')} AS iban,
            ${decryptedColumn('account_number_encrypted')} AS account_number,
            ${decryptedColumn('phone_number_encrypted')} AS phone_number,
            ${decryptedColumn('contact_email_encrypted')} AS contact_email,
            ${decryptedColumn('address_encrypted')} AS address
     FROM employee_payout_details epd
     WHERE employee_id = $1`,
    [employeeId, encKey]
  );
  return rows[0] || null;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const context = await getEmployeePayoutContext(employeeId);
    if (!context) return res.status(404).json({ error: 'Employee not found.' });

    const { payoutCfg, payoutMethod } = context;
    const isWiseManual = payoutMethod === 'wise_manual' && Boolean(getWiseManualDetailsConfig(payoutCfg.code));
    const encKey = getEncryptionKey();
    const row = await fetchPayoutDetails(employeeId, encKey);
    const details = serializeMaskedPayoutDetails(row);

    res.json({
      payoutMethod,
      countryCode: payoutCfg.code,
      countryName: payoutCfg.name,
      currency: payoutCfg.currency,
      isWiseManual,
      isComplete: Boolean(details?.isComplete && isWiseManual),
      details,
    });
  } catch (err) {
    console.error('[payout-details GET]', err.message);
    res.status(500).json({ error: 'Could not load payout details.' });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const context = await getEmployeePayoutContext(employeeId);
    if (!context) return res.status(404).json({ error: 'Employee not found.' });

    const { payoutCfg, payoutMethod } = context;
    if (payoutMethod !== 'wise_manual' || !getWiseManualDetailsConfig(payoutCfg.code)) {
      return res.status(400).json({ error: 'Wise Manual payout details are not required for your country.' });
    }

    const encKey = getEncryptionKey();
    if (!encKey) {
      console.warn('[payout-details PUT] DATA_ENCRYPTION_KEY missing; refusing to store bank details.');
      return res.status(503).json({ error: 'Secure payout details storage is not configured. Please try again later.' });
    }

    const { valid, errors, details } = validateWisePayoutDetails(payoutCfg.code, req.body || {});
    if (!valid) {
      return res.status(400).json({ error: 'Please check your bank details.', errors });
    }

    const detailsLast4 = getDetailsLast4(details);
    const params = [
      employeeId,
      'wise_manual',
      payoutCfg.code,
      payoutCfg.currency,
      details.account_holder_name || null,
      details.account_holder_name_en || null,
      details.bank_name || null,
      details.rib_number || null,
      details.iban || null,
      details.account_number || null,
      details.phone_number || null,
      details.contact_email || null,
      details.address || null,
      detailsLast4,
      details.is_confirmed,
      encKey,
    ];

    const { rows } = await pool.query(
      `INSERT INTO employee_payout_details (
         employee_id, payout_method, country_code, currency,
         account_holder_name, account_holder_name_en, bank_name,
         rib_number_encrypted, iban_encrypted, account_number_encrypted,
         phone_number_encrypted, contact_email_encrypted, address_encrypted,
         details_last4, is_confirmed
       )
       VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         CASE WHEN NULLIF($8::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($8::text, $16::text) END,
         CASE WHEN NULLIF($9::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($9::text, $16::text) END,
         CASE WHEN NULLIF($10::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($10::text, $16::text) END,
         CASE WHEN NULLIF($11::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($11::text, $16::text) END,
         CASE WHEN NULLIF($12::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($12::text, $16::text) END,
         CASE WHEN NULLIF($13::text, '') IS NULL THEN NULL ELSE pgp_sym_encrypt($13::text, $16::text) END,
         $14, $15
       )
       ON CONFLICT (employee_id) DO UPDATE SET
         payout_method = EXCLUDED.payout_method,
         country_code = EXCLUDED.country_code,
         currency = EXCLUDED.currency,
         account_holder_name = EXCLUDED.account_holder_name,
         account_holder_name_en = EXCLUDED.account_holder_name_en,
         bank_name = EXCLUDED.bank_name,
         rib_number_encrypted = EXCLUDED.rib_number_encrypted,
         iban_encrypted = EXCLUDED.iban_encrypted,
         account_number_encrypted = EXCLUDED.account_number_encrypted,
         phone_number_encrypted = EXCLUDED.phone_number_encrypted,
         contact_email_encrypted = EXCLUDED.contact_email_encrypted,
         address_encrypted = EXCLUDED.address_encrypted,
         details_last4 = EXCLUDED.details_last4,
         is_confirmed = EXCLUDED.is_confirmed,
         updated_at = NOW()
       RETURNING id, payout_method, country_code, currency, account_holder_name,
                 account_holder_name_en, bank_name, details_last4, is_confirmed,
                 created_at, updated_at`,
      params
    );

    res.json({
      success: true,
      message: 'Bank details saved successfully.',
      details: serializeMaskedPayoutDetails(rows[0]),
    });
  } catch (err) {
    console.error('[payout-details PUT]', err.message);
    res.status(500).json({ error: 'Could not save payout details.' });
  }
});

module.exports = router;
