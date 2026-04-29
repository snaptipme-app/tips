// Field-level encryption helpers backed by PostgreSQL's `pgcrypto` extension.
//
// `account_details` for withdrawals contains IBAN / RIB / mobile-wallet
// identifiers. The legacy plaintext column is kept around for backward compat;
// new writes target `account_details_enc` (BYTEA) via `pgp_sym_encrypt`. Reads
// COALESCE the decrypted value with the legacy plaintext, so a deploy without
// the env var set continues to function — just without encryption.
//
// The key lives in `process.env.DATA_ENCRYPTION_KEY`. Generate with
//   openssl rand -base64 48
// See docs/db-hardening.md for the runbook.

let warned = false;

function getEncryptionKey() {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    if (!warned) {
      console.warn(
        '[cryptoFields] DATA_ENCRYPTION_KEY is not set (or is too short). ' +
          'Withdrawal account_details will be written as plaintext into the ' +
          'legacy column. Set the key in server/.env and run ' +
          'server/scripts/encrypt-legacy-withdrawals.js to backfill.'
      );
      warned = true;
    }
    return null;
  }
  return key;
}

function isEncryptionEnabled() {
  return getEncryptionKey() !== null;
}

// SQL fragment that resolves to the decrypted account_details on a row of
// `withdrawals`. Pass the parameter index for the encryption key. The caller
// must include `getEncryptionKey()` at that index in the param array.
//
//   const idx = params.length + 1;
//   params.push(getEncryptionKey() || '');  // empty string is harmless when enc col is NULL
//   sql += `, ${decryptedAccountDetailsExpr(idx)} AS account_details`;
function decryptedAccountDetailsExpr(keyParamIndex, alias = 'w') {
  // CASE rather than COALESCE so the decrypt only runs when there's ciphertext;
  // calling pgp_sym_decrypt on NULL with the wrong key would otherwise error.
  return `CASE
    WHEN ${alias}.account_details_enc IS NOT NULL
      THEN pgp_sym_decrypt(${alias}.account_details_enc, $${keyParamIndex})
    ELSE ${alias}.account_details
  END`;
}

module.exports = {
  getEncryptionKey,
  isEncryptionEnabled,
  decryptedAccountDetailsExpr,
};
