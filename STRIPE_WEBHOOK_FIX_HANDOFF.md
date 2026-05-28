# SnapTip Stripe Webhook Fix Handoff

Date: 2026-05-27

## Goal

Fix the Stripe sandbox flow where:

- PaymentIntent creation worked.
- Stripe PaymentElement rendered.
- `stripe.confirmPayment()` returned `succeeded`.
- Stripe webhooks were not reaching `https://snaptip.me/api/payment/webhook`.
- PM2 logs did not show webhook signature verification.

## Current Architecture

- Tourist pays through Stripe PaymentElement on `snaptip.me/:username`.
- Backend creates Stripe PaymentIntents in USD because Stripe does not support MAD.
- Conversion currently uses fixed rate:
  - `1 USD = 10 MAD`
  - Local amount divided by `10`
- PaymentIntent metadata stores:
  - `original_amount`
  - `original_currency`
  - employee metadata
  - rating
- Webhook receives `payment_intent.succeeded`.
- Webhook updates the employee balance using the original local amount/currency from metadata.

## Files Inspected

Local and/or VPS:

- `server/routes/payment.js`
- `server/lib/stripe.js`
- `server/index.js` route registration only
- `server/.env` usage
- `client/src/pages/TipPage.jsx`
- `client/dist/index.html`
- `client/dist/assets/index-*.js`
- `SNAPTIP_CONTEXT_UPDATED.md`

## Code State

No tracked repo code change was needed during the final webhook fix.

Previously completed code already had:

- `PaymentElement` rendering.
- `elements.submit()` before `stripe.confirmPayment()`.
- PaymentIntent creation in USD.
- Local amount/currency saved in PaymentIntent metadata.
- Webhook handler reading local metadata.
- Webhook route using raw body:
  - `express.raw({ type: 'application/json' })`
- `rateLimit.js` fixed with `ipKeyGenerator`.

## Root Cause Found

The active Stripe webhook endpoint existed in the same Stripe test account as the PaymentIntents, but it was subscribed to the wrong event:

```text
checkout.session.completed
```

SnapTip does not use Stripe Checkout Sessions. It uses PaymentElement / PaymentIntent.

The correct event is:

```text
payment_intent.succeeded
```

After changing the endpoint event, Stripe started delivering events, but signature verification failed because the old webhook endpoint signing secret did not match `server/.env`.

## Fix Applied On VPS / Stripe

Working directory used:

```bash
/var/www/snaptip
```

Actions performed:

1. Verified deployed app was on commit:

```text
f0273fe fix: process Stripe tips in USD with local metadata
```

2. Verified PM2 app:

```text
name: snaptip
cwd: /var/www/snaptip/server
script: /var/www/snaptip/server/index.js
```

3. Used the server Stripe secret key to inspect Stripe:

- Stripe account:
  - `acct_1TbOHp7GHPoNUHO4`
  - test mode
  - US account
- Recent PaymentIntents existed and were `succeeded`.
- Webhook endpoint URL existed:

```text
https://snaptip.me/api/payment/webhook
```

4. Found webhook endpoint had wrong event:

```text
checkout.session.completed
```

5. Updated webhook configuration:

- Disabled old endpoint.
- Created new endpoint for:

```text
https://snaptip.me/api/payment/webhook
```

with enabled event:

```text
payment_intent.succeeded
```

6. Updated VPS file:

```text
/var/www/snaptip/server/.env
```

with the new Stripe webhook signing secret.

Do not paste the secret into chat. It starts with `whsec_`.

7. Restarted only the SnapTip PM2 process:

```bash
pm2 restart snaptip --update-env
```

using PM2 binary:

```bash
/root/.nvm/versions/node/v24.14.1/bin/pm2
```

## Validation Performed

Created a diagnostic Stripe test PaymentIntent with:

- `amount: 100`
- `currency: usd`
- `payment_method: pm_card_visa`
- `confirm: true`
- no employee metadata

This was intentional so the webhook would verify delivery/signature but stop before DB write.

PM2 logs confirmed:

```text
[webhook] received event
[payment/webhook] Signature verified: payment_intent.succeeded
```

The handler then logged missing employee metadata for the diagnostic PaymentIntent, which was expected and safe.

## Current Result

Webhook delivery is now working.

Expected real payment logs:

```text
[webhook] received event
[payment/webhook] Signature verified: payment_intent.succeeded
[payment/webhook] Employee balance updated
```

## Important VPS Notes

The VPS git working tree already had unrelated local changes before the webhook fix:

```text
M client/package-lock.json
M server/middleware/rateLimit.js
M server/package-lock.json
?? server/snaptip.db.backup
```

These were not touched or committed.

Be careful with `git pull` on the VPS until those local changes are understood.

## What To Test Next

1. Open:

```text
https://snaptip.me/oussamahitte
```

2. Pay with Stripe test card:

```text
4242 4242 4242 4242
Any future expiry
Any CVC
```

3. Watch logs:

```bash
ssh root@156.67.28.181
/root/.nvm/versions/node/v24.14.1/bin/pm2 logs snaptip
```

4. Confirm:

- Stripe Dashboard test mode shows the payment.
- Webhook delivery succeeded.
- Employee balance increases by local amount, e.g. `50 MAD`, not USD amount.

## Security Reminder

The VPS password was shared during debugging. Change it after confirming everything works.

