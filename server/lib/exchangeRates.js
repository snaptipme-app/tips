const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const EXCHANGE_RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_USD_RATES = {
  USD: 1,
  AED: 3.67,
  MAD: 9.19,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.34,
  JPY: 155.0,
  HKD: 7.82,
  CHF: 0.9,
  NOK: 10.5,
  DKK: 6.9,
  SEK: 10.4,
  PLN: 4.0,
  NZD: 1.63,
  THB: 36.5,
  PHP: 58.0,
  IDR: 16000,
  MYR: 4.7,
  MXN: 18.0,
};

let exchangeRateCache = {
  fetchedAt: 0,
  rates: null,
};

function normalizeCurrency(currency) {
  return String(currency || 'MAD').trim().toUpperCase();
}

async function getUsdExchangeRates() {
  const now = Date.now();
  if (
    exchangeRateCache.rates &&
    now - exchangeRateCache.fetchedAt < EXCHANGE_RATE_CACHE_TTL_MS
  ) {
    return exchangeRateCache.rates;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API_URL);
    if (!response.ok) {
      throw new Error(`Exchange rate API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.rates || typeof data.rates !== 'object') {
      throw new Error('Exchange rate API returned an invalid payload');
    }

    exchangeRateCache = {
      fetchedAt: now,
      rates: data.rates,
    };
    return data.rates;
  } catch (err) {
    console.error('Exchange API Error:', err?.message || err);
    if (exchangeRateCache.rates) {
      console.warn('[exchange] exchange rate API unavailable, using stale cached live rates');
      return exchangeRateCache.rates;
    }
    console.warn('[exchange] exchange rate API unavailable, using fallback rates');
    return FALLBACK_USD_RATES;
  }
}

function convertLocalAmountToUsdWithRates(amount, currency, rates) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    throw new Error('Invalid amount for USD conversion');
  }

  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === 'USD') {
    return {
      usdAmount: numericAmount,
      exchangeRate: 1,
    };
  }

  const exchangeRate = Number(rates?.[normalizedCurrency]);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error(`No USD exchange rate available for ${normalizedCurrency}`);
  }

  return {
    usdAmount: numericAmount / exchangeRate,
    exchangeRate,
  };
}

async function convertLocalAmountToUsd(amount, currency) {
  const rates = await getUsdExchangeRates();
  return convertLocalAmountToUsdWithRates(amount, currency, rates);
}

module.exports = {
  FALLBACK_USD_RATES,
  convertLocalAmountToUsd,
  convertLocalAmountToUsdWithRates,
  getUsdExchangeRates,
  normalizeCurrency,
};
