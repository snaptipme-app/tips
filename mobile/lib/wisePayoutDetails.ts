export type WisePayoutFieldKey =
  | 'account_holder_name'
  | 'account_holder_name_en'
  | 'bank_name'
  | 'rib_number'
  | 'iban'
  | 'account_number'
  | 'phone_number'
  | 'contact_email'
  | 'address';

export interface WisePayoutField {
  key: WisePayoutFieldKey;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  helper?: string;
  multiline?: boolean;
}

export interface WisePayoutCountryConfig {
  code: string;
  name: string;
  currency: string;
  fields: WisePayoutField[];
}

export const WISE_PAYOUT_DETAILS_CONFIG: Record<string, WisePayoutCountryConfig> = {
  MA: {
    code: 'MA',
    name: 'Morocco',
    currency: 'MAD',
    fields: [
      { key: 'account_holder_name', label: 'Full Legal Name', placeholder: 'Your full legal name' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Attijariwafa Bank' },
      { key: 'rib_number', label: 'RIB Number', placeholder: '24 digits', keyboardType: 'numeric', helper: 'Enter your 24-digit Moroccan RIB.' },
      { key: 'phone_number', label: 'Phone Number', placeholder: '+212XXXXXXXXX or 06XXXXXXXX', keyboardType: 'phone-pad', helper: 'We may use your phone number to confirm payout details if needed.' },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    fields: [
      { key: 'account_holder_name_en', label: 'Account Holder Name in English', placeholder: 'Your name in English' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Emirates NBD' },
      { key: 'iban', label: 'IBAN', placeholder: 'AE070331234567890123456', helper: 'UAE IBAN must start with AE and contain 23 characters.' },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    fields: [
      { key: 'account_holder_name', label: 'Full Legal Name', placeholder: 'Your full legal name' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. BDO, BPI, Metrobank' },
      { key: 'account_number', label: 'Account Number', placeholder: '6 to 18 digits', keyboardType: 'numeric' },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    currency: 'IDR',
    fields: [
      { key: 'account_holder_name', label: 'Full Legal Name', placeholder: 'Your full legal name' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. BCA, Mandiri, BRI' },
      { key: 'account_number', label: 'Account Number', placeholder: '7 to 18 digits', keyboardType: 'numeric' },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
  TH: {
    code: 'TH',
    name: 'Thailand',
    currency: 'THB',
    fields: [
      { key: 'account_holder_name', label: 'Full Legal Name', placeholder: 'Your full legal name' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Bangkok Bank, Kasikornbank' },
      { key: 'account_number', label: 'Account Number', placeholder: '5 to 16 digits', keyboardType: 'numeric' },
      { key: 'address', label: 'Address', placeholder: 'Your residential address', multiline: true },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    fields: [
      { key: 'account_holder_name', label: 'Full Legal Name', placeholder: 'Your full legal name' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Maybank, CIMB, Public Bank' },
      { key: 'account_number', label: 'Account Number', placeholder: '7 to 20 digits', keyboardType: 'numeric' },
      { key: 'contact_email', label: 'Contact Email', placeholder: 'you@example.com', keyboardType: 'email-address', helper: 'We may use this email to contact you if there is an issue with your payout.' },
    ],
  },
};

export function getWisePayoutDetailsConfig(countryCode: string): WisePayoutCountryConfig | null {
  return WISE_PAYOUT_DETAILS_CONFIG[String(countryCode || '').toUpperCase()] ?? null;
}

export function validateWisePayoutDetails(countryCode: string, values: Record<string, string>, isConfirmed: boolean) {
  const config = getWisePayoutDetailsConfig(countryCode);
  const errors: Record<string, string> = {};
  if (!config) {
    errors.country = 'Wise Manual payouts are not available for this country.';
    return errors;
  }

  for (const field of config.fields) {
    if (!String(values[field.key] || '').trim()) {
      errors[field.key] = 'This field is required.';
    }
  }

  const email = String(values.contact_email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.contact_email = 'Enter a valid contact email.';
  }

  const accountNumber = String(values.account_number || '').replace(/\D/g, '');
  const ribNumber = String(values.rib_number || '').replace(/\D/g, '');
  const phoneNumber = String(values.phone_number || '').replace(/[^\d+]/g, '');
  const iban = String(values.iban || '').replace(/\s+/g, '').toUpperCase();

  if (countryCode === 'MA' && ribNumber && ribNumber.length !== 24) errors.rib_number = 'RIB number must be exactly 24 digits.';
  if (countryCode === 'MA' && phoneNumber && !/^(?:\+212[67]\d{8}|0[67]\d{8})$/.test(phoneNumber)) errors.phone_number = 'Enter a valid Moroccan phone number.';
  if (countryCode === 'AE' && iban && (iban.length !== 23 || !iban.startsWith('AE'))) errors.iban = 'UAE IBAN must start with AE and be 23 characters.';
  if (countryCode === 'AE' && values.account_holder_name_en && !/^[A-Za-z\s.'-]+$/.test(String(values.account_holder_name_en))) errors.account_holder_name_en = 'Enter the account holder name in English.';
  if (countryCode === 'PH' && accountNumber && !/^\d{6,18}$/.test(accountNumber)) errors.account_number = 'Account number must be 6 to 18 digits.';
  if (countryCode === 'ID' && accountNumber && !/^\d{7,18}$/.test(accountNumber)) errors.account_number = 'Account number must be 7 to 18 digits.';
  if (countryCode === 'TH' && accountNumber && !/^\d{5,16}$/.test(accountNumber)) errors.account_number = 'Account number must be 5 to 16 digits.';
  if (countryCode === 'MY' && accountNumber && !/^\d{7,20}$/.test(accountNumber)) errors.account_number = 'Account number must be 7 to 20 digits.';
  if (!isConfirmed) errors.is_confirmed = 'Please confirm these bank details belong to you.';

  return errors;
}
