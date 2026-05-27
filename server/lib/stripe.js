const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const hasUsableSecretKey = Boolean(
  stripeSecretKey
  && /^sk_(test|live)_/.test(stripeSecretKey)
  && !stripeSecretKey.includes('...')
);

const stripe = hasUsableSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

module.exports = {
  stripe,
  stripeConfigError: hasUsableSecretKey
    ? null
    : 'Stripe is not configured. Add a real STRIPE_SECRET_KEY on the server.',
};
