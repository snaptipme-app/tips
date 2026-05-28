const MONEY_SCALE = 100;
const PLATFORM_FEE_PERCENT = 10;
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF',
  'XOF', 'XPF',
]);

function normalizeCurrency(currency) {
  return String(currency || '').trim().toUpperCase();
}

function parseMoneyToMinor(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = (fraction + '00').slice(0, 2);
  const minor = (BigInt(whole) * BigInt(MONEY_SCALE)) + BigInt(cents);
  return minor > 0n ? minor : null;
}

function minorToMoneyString(minor) {
  const safeMinor = BigInt(minor);
  const whole = safeMinor / BigInt(MONEY_SCALE);
  const cents = String(safeMinor % BigInt(MONEY_SCALE)).padStart(2, '0');
  return `${whole}.${cents}`;
}

function moneyStringToNumber(value) {
  return Number(minorToMoneyString(parseMoneyToMinor(value) ?? 0n));
}

function calculatePlatformBreakdown(grossAmount, feePercent = PLATFORM_FEE_PERCENT) {
  const grossMinor = parseMoneyToMinor(grossAmount);
  if (!grossMinor) return null;

  const feeMinor = (grossMinor * BigInt(feePercent) + 50n) / 100n;
  const netMinor = grossMinor - feeMinor;

  return {
    grossAmount: minorToMoneyString(grossMinor),
    platformFeeAmount: minorToMoneyString(feeMinor),
    platformFeePercent: feePercent,
    netAmount: minorToMoneyString(netMinor),
  };
}

module.exports = {
  PLATFORM_FEE_PERCENT,
  ZERO_DECIMAL_CURRENCIES,
  parseMoneyToMinor,
  minorToMoneyString,
  moneyStringToNumber,
  calculatePlatformBreakdown,
  normalizeCurrency,
};
