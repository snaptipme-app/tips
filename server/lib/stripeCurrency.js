const { getCountryPayoutConfig, normalizeCountryCode } = require('./countryPayoutConfig');
const { normalizeCurrency, ZERO_DECIMAL_CURRENCIES } = require('./money');

function getStripePaymentCurrency(countryCode) {
  const config = getCountryPayoutConfig(normalizeCountryCode(countryCode));
  return normalizeCurrency(config?.currency || 'USD');
}

function getStripeTransferCurrency(countryCode) {
  return getStripePaymentCurrency(countryCode);
}

function toStripeMinorUnit(amount, currency) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  return ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)
    ? Math.round(numericAmount)
    : Math.round(numericAmount * 100);
}

function fromStripeMinorUnit(amount, currency) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return 0;
  const normalizedCurrency = normalizeCurrency(currency);
  return ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)
    ? numericAmount
    : numericAmount / 100;
}

function getAvailableBalanceMinor(stripeBalance, currency) {
  const normalizedCurrency = normalizeCurrency(currency).toLowerCase();
  return (stripeBalance?.available || [])
    .filter(item => String(item.currency || '').toLowerCase() === normalizedCurrency)
    .reduce((total, item) => total + BigInt(item.amount || 0), 0n);
}

module.exports = {
  getStripePaymentCurrency,
  getStripeTransferCurrency,
  toStripeMinorUnit,
  fromStripeMinorUnit,
  getAvailableBalanceMinor,
};
