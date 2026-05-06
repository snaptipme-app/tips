export interface CountryOption {
  id: string;
  code: string;
  name: string;
  currency: string;
}

export const COUNTRY_DATA: CountryOption[] = [
  { id: 'Morocco',       code: 'MA', name: 'Morocco',       currency: 'MAD' },
  { id: 'UAE',           code: 'AE', name: 'UAE',           currency: 'AED' },
  { id: 'United States', code: 'US', name: 'United States', currency: 'USD' },
  { id: 'France',        code: 'FR', name: 'France',        currency: 'EUR' },
  { id: 'Spain',         code: 'ES', name: 'Spain',         currency: 'EUR' },
  { id: 'Germany',       code: 'DE', name: 'Germany',       currency: 'EUR' },
  { id: 'Italy',         code: 'IT', name: 'Italy',         currency: 'EUR' },
  { id: 'Philippines',   code: 'PH', name: 'Philippines',   currency: 'PHP' },
  { id: 'Indonesia',     code: 'ID', name: 'Indonesia',     currency: 'IDR' },
  { id: 'Thailand',      code: 'TH', name: 'Thailand',      currency: 'THB' },
];

export const COUNTRY_CODE_MAP: Record<string, string> = Object.fromEntries(
  COUNTRY_DATA.map(c => [c.id, c.code])
);
