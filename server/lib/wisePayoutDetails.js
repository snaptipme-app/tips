const WISE_MANUAL_PAYOUT_DETAILS_CONFIG = {
  MA: {
    code: 'MA',
    name: 'Morocco',
    currency: 'MAD',
    required: ['account_holder_name', 'bank_name', 'rib_number', 'phone_number', 'contact_email'],
    primarySensitiveField: 'rib_number',
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    required: ['account_holder_name_en', 'bank_name', 'iban', 'contact_email'],
    primarySensitiveField: 'iban',
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    required: ['account_holder_name', 'bank_name', 'account_number', 'contact_email'],
    primarySensitiveField: 'account_number',
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    currency: 'IDR',
    required: ['account_holder_name', 'bank_name', 'account_number', 'contact_email'],
    primarySensitiveField: 'account_number',
  },
  TH: {
    code: 'TH',
    name: 'Thailand',
    currency: 'THB',
    required: ['account_holder_name', 'bank_name', 'account_number', 'address', 'contact_email'],
    primarySensitiveField: 'account_number',
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    required: ['account_holder_name', 'bank_name', 'account_number', 'contact_email'],
    primarySensitiveField: 'account_number',
  },
};

function cleanText(value, max = 180) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  return cleanText(value, 220).toLowerCase();
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function normalizeIban(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCountryCode(countryCode) {
  return String(countryCode || '').trim().toUpperCase();
}

function getWiseManualDetailsConfig(countryCode) {
  return WISE_MANUAL_PAYOUT_DETAILS_CONFIG[normalizeCountryCode(countryCode)] || null;
}

function validationError(errors, key, message) {
  errors[key] = message;
}

function normalizeWisePayoutDetails(countryCode, input = {}) {
  const code = normalizeCountryCode(countryCode);
  return {
    country_code: code,
    account_holder_name: cleanText(input.account_holder_name || input.fullName || input.full_name),
    account_holder_name_en: cleanText(input.account_holder_name_en || input.accountHolderNameEn),
    bank_name: cleanText(input.bank_name || input.bankName || input.bank),
    rib_number: digitsOnly(input.rib_number || input.ribNumber || input.rib),
    iban: normalizeIban(input.iban || input.IBAN),
    account_number: digitsOnly(input.account_number || input.accountNumber),
    phone_number: normalizePhone(input.phone_number || input.phoneNumber || input.phone),
    contact_email: cleanEmail(input.contact_email || input.contactEmail || input.email),
    address: cleanText(input.address, 500),
    is_confirmed: Boolean(input.is_confirmed || input.isConfirmed),
  };
}

function validateWisePayoutDetails(countryCode, input = {}) {
  const config = getWiseManualDetailsConfig(countryCode);
  const details = normalizeWisePayoutDetails(countryCode, input);
  const errors = {};

  if (!config) {
    validationError(errors, 'country_code', 'Wise Manual payouts are not available for this country.');
    return { valid: false, errors, details, config: null };
  }

  for (const field of config.required) {
    if (!details[field]) {
      validationError(errors, field, 'This field is required.');
    }
  }

  if (details.contact_email && !isEmail(details.contact_email)) {
    validationError(errors, 'contact_email', 'Enter a valid contact email.');
  }

  if (details.rib_number && details.rib_number.length !== 24) {
    validationError(errors, 'rib_number', 'RIB number must be exactly 24 digits.');
  }

  if (codeIs(countryCode, 'MA') && details.phone_number && !/^(?:\+212[67]\d{8}|0[67]\d{8})$/.test(details.phone_number)) {
    validationError(errors, 'phone_number', 'Enter a valid Moroccan phone number.');
  }

  if (details.iban && (details.iban.length !== 23 || !details.iban.startsWith('AE'))) {
    validationError(errors, 'iban', 'UAE IBAN must start with AE and be 23 characters.');
  }

  if (codeIs(countryCode, 'AE') && details.account_holder_name_en && !/^[A-Za-z\s.'-]+$/.test(details.account_holder_name_en)) {
    validationError(errors, 'account_holder_name_en', 'Enter the account holder name in English.');
  }

  if (codeIs(countryCode, 'PH') && details.account_number && !/^\d{6,18}$/.test(details.account_number)) {
    validationError(errors, 'account_number', 'Account number must be 6 to 18 digits.');
  }

  if (codeIs(countryCode, 'ID') && details.account_number && !/^\d{7,18}$/.test(details.account_number)) {
    validationError(errors, 'account_number', 'Account number must be 7 to 18 digits.');
  }

  if (codeIs(countryCode, 'TH') && details.account_number && !/^\d{5,16}$/.test(details.account_number)) {
    validationError(errors, 'account_number', 'Account number must be 5 to 16 digits.');
  }

  if (codeIs(countryCode, 'MY') && details.account_number && !/^\d{7,20}$/.test(details.account_number)) {
    validationError(errors, 'account_number', 'Account number must be 7 to 20 digits.');
  }

  if (!details.is_confirmed) {
    validationError(errors, 'is_confirmed', 'Please confirm these bank details belong to you.');
  }

  return { valid: Object.keys(errors).length === 0, errors, details, config };
}

function codeIs(countryCode, expected) {
  return normalizeCountryCode(countryCode) === expected;
}

function getPrimarySensitiveValue(details) {
  return details.rib_number || details.iban || details.account_number || '';
}

function getDetailsLast4(details) {
  const primary = getPrimarySensitiveValue(details);
  return primary ? primary.slice(-4) : null;
}

function maskValue(value, visible = 4) {
  const raw = String(value || '');
  if (!raw) return null;
  const suffix = raw.slice(-visible);
  return `${'*'.repeat(Math.max(4, Math.min(12, raw.length - suffix.length)))}${suffix}`;
}

function maskPhone(value) {
  const raw = String(value || '');
  if (!raw) return null;
  const suffix = raw.slice(-3);
  return raw.startsWith('+')
    ? `${raw.slice(0, 4)}******${suffix}`
    : `******${suffix}`;
}

function maskEmail(value) {
  const email = String(value || '');
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

function serializeMaskedPayoutDetails(row = {}) {
  if (!row || !row.id) return null;
  return {
    id: row.id,
    payoutMethod: row.payout_method || 'wise_manual',
    countryCode: row.country_code,
    currency: row.currency,
    accountHolderName: row.account_holder_name || null,
    accountHolderNameEn: row.account_holder_name_en || null,
    bankName: row.bank_name || null,
    detailsLast4: row.details_last4 || null,
    isConfirmed: Boolean(row.is_confirmed),
    isComplete: Boolean(row.is_confirmed),
    updatedAt: row.updated_at || null,
    masked: {
      ribNumber: row.rib_number ? maskValue(row.rib_number) : (row.details_last4 && row.country_code === 'MA' ? maskValue(row.details_last4) : null),
      iban: row.iban ? maskValue(row.iban) : null,
      accountNumber: row.account_number ? maskValue(row.account_number) : (row.details_last4 && !['MA', 'AE'].includes(row.country_code) ? maskValue(row.details_last4) : null),
      phoneNumber: row.phone_number ? maskPhone(row.phone_number) : null,
      contactEmail: row.contact_email ? maskEmail(row.contact_email) : null,
      address: row.address ? 'Saved' : null,
    },
  };
}

function serializeFullPayoutDetails(row = {}) {
  if (!row || !row.id) return null;
  return {
    id: row.id,
    payoutMethod: row.payout_method || 'wise_manual',
    countryCode: row.country_code,
    currency: row.currency,
    accountHolderName: row.account_holder_name || null,
    accountHolderNameEn: row.account_holder_name_en || null,
    bankName: row.bank_name || null,
    ribNumber: row.rib_number || null,
    iban: row.iban || null,
    accountNumber: row.account_number || null,
    phoneNumber: row.phone_number || null,
    contactEmail: row.contact_email || null,
    address: row.address || null,
    detailsLast4: row.details_last4 || null,
    isConfirmed: Boolean(row.is_confirmed),
    updatedAt: row.updated_at || null,
  };
}

function payoutDetailsToWithdrawalAccountDetails(row = {}) {
  const full = serializeFullPayoutDetails(row);
  if (!full) return null;
  return {
    fullName: full.accountHolderName || full.accountHolderNameEn || '',
    bankName: full.bankName || '',
    accountNumber: full.ribNumber || full.iban || full.accountNumber || '',
    phone: full.phoneNumber || '',
    contactEmail: full.contactEmail || '',
    address: full.address || '',
    countryCode: full.countryCode,
    currency: full.currency,
  };
}

module.exports = {
  WISE_MANUAL_PAYOUT_DETAILS_CONFIG,
  getWiseManualDetailsConfig,
  validateWisePayoutDetails,
  normalizeWisePayoutDetails,
  getDetailsLast4,
  serializeMaskedPayoutDetails,
  serializeFullPayoutDetails,
  payoutDetailsToWithdrawalAccountDetails,
  maskEmail,
  maskPhone,
  maskValue,
};
