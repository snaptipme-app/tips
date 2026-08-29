/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — Stripe processing-fee schedule + "customer covers fees" math

   WHY THIS EXISTS
   ───────────────
   processPayment.js credits the employee the FULL gross tip, and SnapTip takes
   its 10% margin later, at withdrawal time (see lib/money.js). That only works
   if the money actually landing in the Stripe balance equals the gross tip.
   It doesn't: Stripe takes its cut off the top, and on small tips that cut is
   bigger than the whole margin.

     $2.00 tip charged at 2.9% + $0.30  ->  Stripe keeps        $0.36
                                            SnapTip's 10% is    $0.20
                                            SnapTip is $0.16 in the hole and
                                            still owes the employee $1.80.

   So the guest covers processing. We gross the charge up so that after Stripe
   takes its fee, the NET amount received equals the tip the guest chose:

       total = (tip + fixed) / (1 - percent)

   The employee is still credited exactly `tip` — the webhook reads
   metadata.original_amount, never the charged total — so the surcharge is not
   income to anyone. It only cancels out Stripe's cut.

   VERIFY THESE NUMBERS against your own Stripe dashboard (Settings -> Pricing)
   before relying on them. Stripe's published pricing changes over time, can be
   negotiated per account, and differs by where the card was issued. Every row
   below is Stripe's STANDARD DOMESTIC online-card rate. Cards issued outside
   the charge's region cost more — see CROSS_BORDER_PERCENT.

   NOTE ON KEYING: the fee that actually applies is set by YOUR Stripe account's
   country, not by the currency shown to the guest. This table is keyed by
   charge currency because that is the axis that matters once charges are
   presented in local currency. While routes/payment.js converts every tip to
   USD before charging, every lookup here resolves to the USD row.
   ────────────────────────────────────────────────────────────────────────── */

const { normalizeCurrency, ZERO_DECIMAL_CURRENCIES } = require('./money');

/* Extra percentage added on top of the schedule rate, covering cards issued
   outside the charge region plus currency conversion. On a US account Stripe
   adds roughly +1.5% (international card) and +1% (conversion), and SnapTip's
   guests are overwhelmingly tourists paying with foreign cards — so this is
   the common case here, not the exception, and it defaults ON at 2.5%.

   Override with STRIPE_CROSS_BORDER_PERCENT (a percent, not a fraction).
   Set it explicitly to 0 to charge only the domestic schedule rate.

   NOTE: client/src/pages/TipPage.jsx mirrors this default so the total shown
   to the guest matches the charge. Change one, change the other. */
const DEFAULT_CROSS_BORDER_PERCENT = 2.5;
const CROSS_BORDER_PERCENT = (() => {
  const raw = String(process.env.STRIPE_CROSS_BORDER_PERCENT ?? '').trim();
  // An unset or blank env var means "use the default", not "disable".
  const parsed = raw === '' ? DEFAULT_CROSS_BORDER_PERCENT : Number(raw);
  const safe = Number.isFinite(parsed) && parsed >= 0 && parsed < 50
    ? parsed
    : DEFAULT_CROSS_BORDER_PERCENT;
  return safe / 100;
})();

/* percent       - Stripe's variable rate as a fraction (0.029 === 2.9%)
   fixed         - Stripe's per-transaction fixed fee, in MAJOR units
   minimumCharge - Stripe's minimum chargeable amount, in MAJOR units
   note          - the international/cross-border rate, for reference only     */
const STRIPE_FEE_SCHEDULE = {
  USD: { percent: 0.029,  fixed: 0.30,  minimumCharge: 0.50,  note: 'US account. Intl cards +1.5%, currency conversion +1%.' },
  CAD: { percent: 0.029,  fixed: 0.30,  minimumCharge: 0.50,  note: 'CA account. Intl cards +0.8%.' },
  GBP: { percent: 0.015,  fixed: 0.20,  minimumCharge: 0.30,  note: 'UK cards. EEA cards 2.5%, intl 3.25%.' },
  EUR: { percent: 0.015,  fixed: 0.25,  minimumCharge: 0.50,  note: 'EEA cards. UK cards 2.5%, intl 3.25%.' },
  AUD: { percent: 0.0175, fixed: 0.30,  minimumCharge: 0.50,  note: 'AU domestic. Intl cards 2.9% + A$0.30.' },
  NZD: { percent: 0.027,  fixed: 0.30,  minimumCharge: 0.50,  note: 'NZ domestic. Intl cards 3.7%.' },
  SGD: { percent: 0.034,  fixed: 0.50,  minimumCharge: 0.50,  note: 'SG single rate, domestic and intl.' },
  HKD: { percent: 0.034,  fixed: 2.35,  minimumCharge: 4.00,  note: 'HK single rate, domestic and intl.' },
  JPY: { percent: 0.036,  fixed: 0,     minimumCharge: 50,    note: 'JP. Zero-decimal currency, no fixed fee.' },
  CHF: { percent: 0.029,  fixed: 0.30,  minimumCharge: 0.50,  note: 'CH domestic. Intl cards +1.5%.' },
  SEK: { percent: 0.014,  fixed: 1.80,  minimumCharge: 3.00,  note: 'EEA cards. Intl cards 2.9% + 1.80 kr.' },
  DKK: { percent: 0.014,  fixed: 1.80,  minimumCharge: 2.50,  note: 'EEA cards. Intl cards 2.9% + 1.80 kr.' },
  NOK: { percent: 0.014,  fixed: 2.00,  minimumCharge: 3.00,  note: 'EEA cards. Intl cards 2.9% + 2.00 kr.' },
  PLN: { percent: 0.014,  fixed: 1.00,  minimumCharge: 2.00,  note: 'EEA cards. Intl cards 2.9% + 1.00 zl.' },
  MXN: { percent: 0.036,  fixed: 3.00,  minimumCharge: 10.00, note: 'MX domestic.' },
  BRL: { percent: 0.0399, fixed: 0.39,  minimumCharge: 0.50,  note: 'BR domestic.' },
  INR: { percent: 0.02,   fixed: 2.00,  minimumCharge: 0.50,  note: 'IN domestic. Intl cards 3%.' },
  MYR: { percent: 0.03,   fixed: 1.00,  minimumCharge: 2.00,  note: 'MY domestic.' },
  THB: { percent: 0.0365, fixed: 11.00, minimumCharge: 10.00, note: 'TH domestic.' },
  AED: { percent: 0.029,  fixed: 1.00,  minimumCharge: 2.00,  note: 'AE domestic.' },
};

/* Used for any currency Stripe publishes no local pricing for — MAD, PHP, IDR
   and the rest of the manual-payout markets. None of those is ever a Stripe
   charge currency here: the tip is converted to USD first, so the US rate is
   what genuinely applies. That is why the fallback mirrors the USD row. */
const FALLBACK_FEE = {
  percent: 0.029,
  fixed: 0.30,
  minimumCharge: 0.50,
  note: 'Fallback - Stripe account home pricing.',
};

// Percentages are carried as micros so the gross-up stays integer arithmetic.
const PERCENT_SCALE = 1000000n;

function getMinorUnitFactor(currency) {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency)) ? 1 : 100;
}

/**
 * Stripe's fee terms for a charge currency.
 * Never throws and never returns null: an unknown currency falls back to the
 * account's home pricing, flagged with isFallback so callers can log it.
 */
function getStripeFeeConfig(currency) {
  const normalizedCurrency = normalizeCurrency(currency);
  const schedule = STRIPE_FEE_SCHEDULE[normalizedCurrency];
  const base = schedule || FALLBACK_FEE;

  return {
    currency: normalizedCurrency,
    percent: base.percent + CROSS_BORDER_PERCENT,
    basePercent: base.percent,
    crossBorderPercent: CROSS_BORDER_PERCENT,
    fixed: base.fixed,
    minimumCharge: base.minimumCharge,
    isFallback: !schedule,
    note: base.note,
  };
}

/**
 * Gross a tip up so Stripe's cut lands on the guest instead of on SnapTip.
 *
 *     total = (tip + fixed) / (1 - percent)
 *
 * All arithmetic runs in integer minor units (BigInt) so 2.9% of a cent cannot
 * drift, and the total is rounded UP: rounding down would leave SnapTip a cent
 * short, which is the exact failure this function exists to prevent.
 *
 * @param {object} params
 * @param {number} params.tipAmount  Tip in MAJOR units of `currency` (e.g. 5.00)
 * @param {string} params.currency   Charge currency - the one sent to Stripe
 * @returns {object|null} Breakdown, or null when tipAmount is not a positive number.
 */
function calculateCustomerCoveredCharge({ tipAmount, currency }) {
  const numericTip = Number(tipAmount);
  if (!Number.isFinite(numericTip) || numericTip <= 0) return null;

  const feeConfig = getStripeFeeConfig(currency);
  const minorFactor = getMinorUnitFactor(feeConfig.currency);

  const percentMicros = BigInt(Math.round(feeConfig.percent * Number(PERCENT_SCALE)));
  if (percentMicros >= PERCENT_SCALE) {
    // A rate at or above 100% makes the gross-up diverge. Refuse rather than
    // charge a guest something absurd.
    throw new Error(`Invalid Stripe fee percentage for ${feeConfig.currency}.`);
  }

  const tipMinor = BigInt(Math.round(numericTip * minorFactor));
  if (tipMinor <= 0n) return null;
  const fixedMinor = BigInt(Math.round(feeConfig.fixed * minorFactor));

  // Ceiling division: (a + b - 1) / b, valid for positive integers.
  const numerator = (tipMinor + fixedMinor) * PERCENT_SCALE;
  const denominator = PERCENT_SCALE - percentMicros;
  const totalMinor = (numerator + denominator - 1n) / denominator;
  const processingFeeMinor = totalMinor - tipMinor;
  const minimumChargeMinor = BigInt(Math.round(feeConfig.minimumCharge * minorFactor));

  return {
    currency: feeConfig.currency,
    tipAmount: Number(tipMinor) / minorFactor,
    processingFee: Number(processingFeeMinor) / minorFactor,
    totalAmount: Number(totalMinor) / minorFactor,
    tipMinor: Number(tipMinor),
    processingFeeMinor: Number(processingFeeMinor),
    totalMinor: Number(totalMinor),
    minimumChargeMinor: Number(minimumChargeMinor),
    meetsMinimum: totalMinor >= minimumChargeMinor,
    feePercent: feeConfig.percent,
    feeFixed: feeConfig.fixed,
    isFallbackFee: feeConfig.isFallback,
  };
}

module.exports = {
  STRIPE_FEE_SCHEDULE,
  FALLBACK_FEE,
  CROSS_BORDER_PERCENT,
  getStripeFeeConfig,
  calculateCustomerCoveredCharge,
  getMinorUnitFactor,
};
