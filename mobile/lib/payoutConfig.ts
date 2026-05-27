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
  US: { code: 'US', name: 'United States', currency: 'USD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  AU: { code: 'AU', name: 'Australia', currency: 'AUD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'NZD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  SG: { code: 'SG', name: 'Singapore', currency: 'SGD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  HK: { code: 'HK', name: 'Hong Kong', currency: 'HKD', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  JP: { code: 'JP', name: 'Japan', currency: 'JPY', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 2000 },
  FR: { code: 'FR', name: 'France', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  NL: { code: 'NL', name: 'Netherlands', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  PT: { code: 'PT', name: 'Portugal', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  BE: { code: 'BE', name: 'Belgium', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  IE: { code: 'IE', name: 'Ireland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  FI: { code: 'FI', name: 'Finland', currency: 'EUR', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },
  SE: { code: 'SE', name: 'Sweden', currency: 'SEK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 200 },
  DK: { code: 'DK', name: 'Denmark', currency: 'DKK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 150 },
  NO: { code: 'NO', name: 'Norway', currency: 'NOK', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 200 },
  PL: { code: 'PL', name: 'Poland', currency: 'PLN', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 100 },
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF', status: 'active', payoutMethod: 'stripe_connect', autoPayouts: true, manualPayouts: false, minAmount: 20 },

  MA: { code: 'MA', name: 'Morocco', currency: 'MAD', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 200 },
  PH: { code: 'PH', name: 'Philippines', currency: 'PHP', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 1500 },
  ID: { code: 'ID', name: 'Indonesia', currency: 'IDR', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 300000 },
  TH: { code: 'TH', name: 'Thailand', currency: 'THB', status: 'active', payoutMethod: 'wise_manual', autoPayouts: false, manualPayouts: true, minAmount: 700 },

  AE: { code: 'AE', name: 'UAE', currency: 'AED', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minAmount: 50 },
  MY: { code: 'MY', name: 'Malaysia', currency: 'MYR', status: 'review_needed', payoutMethod: 'review_needed', autoPayouts: false, manualPayouts: true, minAmount: 100 },
};

const FALLBACK_CONFIG: PayoutConfig = {
  code: 'US',
  name: 'United States',
  currency: 'USD',
  status: 'review_needed',
  payoutMethod: 'review_needed',
  autoPayouts: false,
  manualPayouts: true,
  minAmount: 20,
};

export function getPayoutConfig(countryCode: string): PayoutConfig {
  return PAYOUT_CONFIG[String(countryCode || '').toUpperCase()] ?? FALLBACK_CONFIG;
}
