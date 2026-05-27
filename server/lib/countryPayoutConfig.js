const COUNTRY_PAYOUT_CONFIG = {
  US: { code: 'US', name: 'United States', currency: 'USD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  AU: { code: 'AU', name: 'Australia', currency: 'AUD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'NZD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  SG: { code: 'SG', name: 'Singapore', currency: 'SGD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  HK: { code: 'HK', name: 'Hong Kong', currency: 'HKD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  JP: { code: 'JP', name: 'Japan', currency: 'JPY', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  FR: { code: 'FR', name: 'France', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  NL: { code: 'NL', name: 'Netherlands', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  PT: { code: 'PT', name: 'Portugal', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  BE: { code: 'BE', name: 'Belgium', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  IE: { code: 'IE', name: 'Ireland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  FI: { code: 'FI', name: 'Finland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  SE: { code: 'SE', name: 'Sweden', currency: 'SEK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  DK: { code: 'DK', name: 'Denmark', currency: 'DKK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  NO: { code: 'NO', name: 'Norway', currency: 'NOK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  PL: { code: 'PL', name: 'Poland', currency: 'PLN', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false },

  MA: { code: 'MA', name: 'Morocco', currency: 'MAD', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true },
  PH: { code: 'PH', name: 'Philippines', currency: 'PHP', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true },
  ID: { code: 'ID', name: 'Indonesia', currency: 'IDR', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true },
  TH: { code: 'TH', name: 'Thailand', currency: 'THB', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true },

  AE: { code: 'AE', name: 'UAE', currency: 'AED', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true },
  MY: { code: 'MY', name: 'Malaysia', currency: 'MYR', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true },
};

function normalizeCountryCode(countryCode) {
  return String(countryCode || '').trim().toUpperCase();
}

function getCountryPayoutConfig(countryCode) {
  return COUNTRY_PAYOUT_CONFIG[normalizeCountryCode(countryCode)] || null;
}

module.exports = {
  COUNTRY_PAYOUT_CONFIG,
  getCountryPayoutConfig,
  normalizeCountryCode,
};
