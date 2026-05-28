const COUNTRY_PAYOUT_CONFIG = {
  US: { code: 'US', name: 'United States', currency: 'USD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  AU: { code: 'AU', name: 'Australia', currency: 'AUD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'NZD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  SG: { code: 'SG', name: 'Singapore', currency: 'SGD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  HK: { code: 'HK', name: 'Hong Kong', currency: 'HKD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  JP: { code: 'JP', name: 'Japan', currency: 'JPY', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  FR: { code: 'FR', name: 'France', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  NL: { code: 'NL', name: 'Netherlands', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  PT: { code: 'PT', name: 'Portugal', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  BE: { code: 'BE', name: 'Belgium', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  IE: { code: 'IE', name: 'Ireland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  FI: { code: 'FI', name: 'Finland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  SE: { code: 'SE', name: 'Sweden', currency: 'SEK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  DK: { code: 'DK', name: 'Denmark', currency: 'DKK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  NO: { code: 'NO', name: 'Norway', currency: 'NOK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  PL: { code: 'PL', name: 'Poland', currency: 'PLN', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minWithdrawalAmount: 10 },

  MA: { code: 'MA', name: 'Morocco', currency: 'MAD', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 100 },
  PH: { code: 'PH', name: 'Philippines', currency: 'PHP', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 500 },
  ID: { code: 'ID', name: 'Indonesia', currency: 'IDR', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 150000 },
  TH: { code: 'TH', name: 'Thailand', currency: 'THB', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 300 },

  AE: { code: 'AE', name: 'UAE', currency: 'AED', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 40 },
  MY: { code: 'MY', name: 'Malaysia', currency: 'MYR', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minWithdrawalAmount: 45 },
};

const COUNTRY_NAME_TO_CODE = Object.values(COUNTRY_PAYOUT_CONFIG).reduce((acc, country) => {
  acc[country.name.toLowerCase()] = country.code;
  return acc;
}, {
  'united arab emirates': 'AE',
  'uk': 'GB',
  'great britain': 'GB',
});

const FALLBACK_MANUAL_CONFIG = {
  code: 'ZZ',
  name: 'Unsupported country',
  currency: 'USD',
  status: 'active',
  payoutMethod: 'wise_manual',
  autoPayouts: false,
  manualPayouts: true,
  minWithdrawalAmount: 10,
};

function normalizeCountryCode(countryCode) {
  return String(countryCode || '').trim().toUpperCase();
}

function getCountryPayoutConfig(countryCode) {
  return COUNTRY_PAYOUT_CONFIG[normalizeCountryCode(countryCode)] || null;
}

function getCountryPayoutConfigByName(countryName) {
  const code = COUNTRY_NAME_TO_CODE[String(countryName || '').trim().toLowerCase()];
  return code ? getCountryPayoutConfig(code) : null;
}

function getEffectivePayoutConfig({ countryCode, countryName, currency } = {}) {
  const config = getCountryPayoutConfig(countryCode) || getCountryPayoutConfigByName(countryName);
  if (config) return config;
  return {
    ...FALLBACK_MANUAL_CONFIG,
    currency: String(currency || FALLBACK_MANUAL_CONFIG.currency).toUpperCase(),
  };
}

function getEffectivePayoutMethod(config) {
  return config?.payoutMethod === 'stripe_connect' && config.autoPayouts
    ? 'stripe_connect'
    : 'wise_manual';
}

function normalizePayoutSchedule(schedule, payoutMethod) {
  const value = String(schedule || 'manual').toLowerCase();
  if (payoutMethod !== 'stripe_connect') return 'manual';
  return ['weekly', 'monthly', 'manual'].includes(value) ? value : 'manual';
}

module.exports = {
  COUNTRY_PAYOUT_CONFIG,
  getCountryPayoutConfig,
  getCountryPayoutConfigByName,
  getEffectivePayoutConfig,
  getEffectivePayoutMethod,
  normalizePayoutSchedule,
  normalizeCountryCode,
};
