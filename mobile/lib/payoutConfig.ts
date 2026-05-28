export type PayoutMethod = 'stripe_connect' | 'wise_manual' | 'review_needed';

export interface PayoutConfig {
  code: string;
  name: string;
  currency: string;
  status: 'active' | 'review_needed';
  payoutMethod: PayoutMethod;
  autoPayouts: boolean;
  manualPayouts: boolean;
  minAmount: number;
}

export const PAYOUT_CONFIG: Record<string, PayoutConfig> = {
  US: { code: 'US', name: 'United States', currency: 'USD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  AU: { code: 'AU', name: 'Australia', currency: 'AUD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'NZD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  SG: { code: 'SG', name: 'Singapore', currency: 'SGD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  HK: { code: 'HK', name: 'Hong Kong', currency: 'HKD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  JP: { code: 'JP', name: 'Japan', currency: 'JPY', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  FR: { code: 'FR', name: 'France', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  NL: { code: 'NL', name: 'Netherlands', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  PT: { code: 'PT', name: 'Portugal', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  BE: { code: 'BE', name: 'Belgium', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  IE: { code: 'IE', name: 'Ireland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  FI: { code: 'FI', name: 'Finland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  SE: { code: 'SE', name: 'Sweden', currency: 'SEK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  DK: { code: 'DK', name: 'Denmark', currency: 'DKK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  NO: { code: 'NO', name: 'Norway', currency: 'NOK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  PL: { code: 'PL', name: 'Poland', currency: 'PLN', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 10 },

  MA: { code: 'MA', name: 'Morocco', currency: 'MAD', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 100 },
  PH: { code: 'PH', name: 'Philippines', currency: 'PHP', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 500 },
  ID: { code: 'ID', name: 'Indonesia', currency: 'IDR', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 150000 },
  TH: { code: 'TH', name: 'Thailand', currency: 'THB', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 300 },

  AE: { code: 'AE', name: 'UAE', currency: 'AED', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minAmount: 50 },
  MY: { code: 'MY', name: 'Malaysia', currency: 'MYR', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minAmount: 100 },
};

const FALLBACK_CONFIG: PayoutConfig = {
  code: 'US',
  name: 'United States',
  currency: 'USD',
  status: 'review_needed',
  payoutMethod: 'wise_manual',
  autoPayouts: false,
  manualPayouts: true,
  minAmount: 20,
};

export function getPayoutConfig(countryCode: string): PayoutConfig {
  return PAYOUT_CONFIG[String(countryCode || '').toUpperCase()] ?? FALLBACK_CONFIG;
}
