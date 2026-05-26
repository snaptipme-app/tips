export interface CountryOption {
  id: string;
  code: string;
  name: string;
  currency: string;
}

export const COUNTRY_DATA: CountryOption[] = [
  { id: 'Australia',      code: 'AU', name: 'Australia',      currency: 'AUD' },
  { id: 'Austria',        code: 'AT', name: 'Austria',        currency: 'EUR' },
  { id: 'Belgium',        code: 'BE', name: 'Belgium',        currency: 'EUR' },
  { id: 'Canada',         code: 'CA', name: 'Canada',         currency: 'CAD' },
  { id: 'Denmark',        code: 'DK', name: 'Denmark',        currency: 'DKK' },
  { id: 'Finland',        code: 'FI', name: 'Finland',        currency: 'EUR' },
  { id: 'France',         code: 'FR', name: 'France',         currency: 'EUR' },
  { id: 'Germany',        code: 'DE', name: 'Germany',        currency: 'EUR' },
  { id: 'Hong Kong',      code: 'HK', name: 'Hong Kong',      currency: 'HKD' },
  { id: 'Indonesia',      code: 'ID', name: 'Indonesia',      currency: 'IDR' },
  { id: 'Ireland',        code: 'IE', name: 'Ireland',        currency: 'EUR' },
  { id: 'Italy',          code: 'IT', name: 'Italy',          currency: 'EUR' },
  { id: 'Japan',          code: 'JP', name: 'Japan',          currency: 'JPY' },
  { id: 'Malaysia',       code: 'MY', name: 'Malaysia',       currency: 'MYR' },
  { id: 'Mexico',         code: 'MX', name: 'Mexico',         currency: 'MXN' },
  { id: 'Morocco',        code: 'MA', name: 'Morocco',        currency: 'MAD' },
  { id: 'Netherlands',    code: 'NL', name: 'Netherlands',    currency: 'EUR' },
  { id: 'New Zealand',    code: 'NZ', name: 'New Zealand',    currency: 'NZD' },
  { id: 'Norway',         code: 'NO', name: 'Norway',         currency: 'NOK' },
  { id: 'Philippines',    code: 'PH', name: 'Philippines',    currency: 'PHP' },
  { id: 'Poland',         code: 'PL', name: 'Poland',         currency: 'PLN' },
  { id: 'Portugal',       code: 'PT', name: 'Portugal',       currency: 'EUR' },
  { id: 'Singapore',      code: 'SG', name: 'Singapore',      currency: 'SGD' },
  { id: 'Spain',          code: 'ES', name: 'Spain',          currency: 'EUR' },
  { id: 'Sweden',         code: 'SE', name: 'Sweden',         currency: 'SEK' },
  { id: 'Switzerland',    code: 'CH', name: 'Switzerland',    currency: 'CHF' },
  { id: 'Thailand',       code: 'TH', name: 'Thailand',       currency: 'THB' },
  { id: 'UAE',            code: 'AE', name: 'UAE',            currency: 'AED' },
  { id: 'United Kingdom', code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { id: 'United States',  code: 'US', name: 'United States',  currency: 'USD' },
];

export const COUNTRY_CODE_MAP: Record<string, string> = Object.fromEntries(
  COUNTRY_DATA.map(c => [c.id, c.code])
);
