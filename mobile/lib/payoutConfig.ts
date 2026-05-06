/**
 * payoutConfig.ts
 *
 * Single source of truth for per-country payout configuration.
 * Import this on both the withdraw screen (validation + UI) and,
 * mirrored as plain JS, on the backend withdrawal endpoint.
 *
 * minAmount reflects realistic local minimums (≈ $5-10 USD equivalent).
 */

export interface PayoutConfig {
  currency: string;
  minAmount: number;
}

/** Keyed by ISO 3166-1 alpha-2 country code */
export const PAYOUT_CONFIG: Record<string, PayoutConfig> = {
  MA: { currency: 'MAD',  minAmount: 200    },  // ≈ $20 USD
  AE: { currency: 'AED',  minAmount: 50     },  // ≈ $14 USD
  US: { currency: 'USD',  minAmount: 20     },
  FR: { currency: 'EUR',  minAmount: 20     },
  ES: { currency: 'EUR',  minAmount: 20     },
  DE: { currency: 'EUR',  minAmount: 20     },
  IT: { currency: 'EUR',  minAmount: 20     },
  PH: { currency: 'PHP',  minAmount: 1500   },  // ≈ $27 USD
  ID: { currency: 'IDR',  minAmount: 300000 },  // ≈ $19 USD
  TH: { currency: 'THB',  minAmount: 700    },  // ≈ $20 USD
};

/** Fallback config when a country code is unrecognised */
const FALLBACK_CONFIG: PayoutConfig = { currency: 'USD', minAmount: 20 };

export function getPayoutConfig(countryCode: string): PayoutConfig {
  return PAYOUT_CONFIG[countryCode] ?? FALLBACK_CONFIG;
}
