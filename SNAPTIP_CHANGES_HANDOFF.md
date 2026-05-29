# SnapTip Changes Handoff

Last updated: 2026-05-29

This file summarizes the major SnapTip changes completed so far around Stripe payments, Stripe Connect onboarding, Wise/manual payouts, withdrawal accounting, scheduled payouts, and production deployment state.

## Current Production State

- Latest pushed commit on `origin/main`: `e7aa9dd feat: add withdrawal preferences and scheduled payouts`
- VPS path: `/var/www/snaptip`
- VPS `HEAD` matches `origin/main` at `e7aa9dd`.
- SnapTip PM2 process name: `snaptip`
- Scheduled payouts are enabled in production:
  - `/var/www/snaptip/server/.env`
  - `DISABLE_SCHEDULED_PAYOUTS=false`
- Scheduler interval:
  - default `900000 ms`
  - 15 minutes
- Last verification showed:
  - PM2 `snaptip` online
  - scheduler started
  - due employees count was `0`
  - recent auto withdrawals were empty
  - no duplicate payout loop
  - no automatic payout was created unexpectedly

## Important Safety Rules

- Tourist payment flow stays on the SnapTip platform Stripe account.
- No destination charges are used.
- No `application_fee_amount` is used at tourist payment time.
- Employee in-app balance increases by the full gross tip amount.
- SnapTip platform fee is taken only at withdrawal time.
- Stripe Connect transfers happen only at withdrawal time.
- Stripe Connect transfer amount is only `net_payout_amount`, not gross.
- Wise/manual payouts remain manual or pending for admin processing.
- Do not touch nginx unless explicitly needed.
- Do not restart unrelated PM2 apps.
- Do not delete VPS-only files.

## Stripe Tourist Payment Flow

Files involved:

- `server/routes/payment.js`
- `server/lib/processPayment.js`
- `server/lib/stripe.js`
- `server/lib/stripeCurrency.js`
- `server/lib/money.js`
- `client/src/pages/TipPage.jsx`

Completed changes:

- Repaired broken Stripe tip payment flow.
- Fixed Stripe PaymentElement rendering.
- Fixed `elements.submit()` ordering before `stripe.confirmPayment()`.
- Added stronger frontend/backend error handling and logs.
- Ensured Stripe Elements provider is configured correctly.
- Fixed webhook handling to use `express.raw({ type: 'application/json' })`.
- Webhook verifies signature with `STRIPE_WEBHOOK_SECRET`.
- Webhook processes `payment_intent.succeeded`.
- Employee balance is credited after successful webhook processing.
- Payment rows store payment and currency metadata.

Current business rule:

- Tourist pays 100 GBP.
- SnapTip platform receives the Stripe payment.
- Employee app balance increases by 100 GBP.
- Platform fee at payment time is 0.
- Fee is calculated later only if/when the employee withdraws.

## Multi-Currency Stripe Payments

Completed changes:

- Stripe Connect employees are charged in their local payout/payment currency where supported.
- Currency helpers were centralized.
- Zero-decimal currency handling was added.

Examples:

- United Kingdom: GBP
- EU countries: EUR
- United States: USD
- Canada: CAD
- Australia: AUD
- Japan: JPY, zero-decimal
- Singapore: SGD
- Hong Kong: HKD
- Switzerland: CHF
- Norway: NOK
- Denmark: DKK
- Sweden: SEK
- Poland: PLN

Stored fields include:

- `original_amount`
- `original_currency`
- `stripe_payment_currency`
- `stripe_payment_amount`
- `employee_balance_currency`
- settlement metadata where available

Wise/manual countries remain local/manual.

## Hybrid Payout Onboarding

Files involved:

- `server/routes/onboarding.js`
- `server/lib/countryPayoutConfig.js`
- mobile payout/country selection flow

Completed changes:

- Added country payout configuration with rollout controls.
- Added Stripe Connect Express onboarding for supported countries.
- Added Wise/manual routing for manual countries.
- Added review-needed state for countries under review.

Country config fields:

- `code`
- `name`
- `currency`
- `payoutMethod`
- `autoPayouts`
- `manualPayouts`

Initial Stripe Connect rollout:

- US, CA, GB, AU, NZ, SG, HK, JP
- FR, DE, ES, IT, NL, PT, BE, AT, IE, FI, SE, DK, NO, PL, CH

Manual Wise rollout:

- MA, PH, ID, TH

Review-needed:

- AE, MY

Stripe Connect onboarding behavior:

- Auth required.
- Uses logged-in employee id from JWT.
- Validates country against config.
- Reuses existing `stripe_account_id`.
- Creates Express account only when needed.
- Generates Stripe account onboarding link.
- Uses:
  - `STRIPE_CONNECT_REFRESH_URL`
  - `STRIPE_CONNECT_RETURN_URL`
- Fallbacks:
  - `https://snaptip.me/onboarding/stripe/refresh`
  - `https://snaptip.me/onboarding/stripe/success`

## Stripe Onboarding Return Pages

Files involved:

- React web routes/pages

Completed changes:

- Added `/onboarding/stripe/success`.
- Added `/onboarding/stripe/refresh`.
- Pages match SnapTip dark theme.
- Pages tell user to return to the app.
- Prevented blank dark screen after Stripe Express redirects.

## Withdrawal-Time Platform Fee

Files involved:

- `server/routes/withdrawals.js`
- `server/db.js`
- mobile withdraw screen
- admin dashboard

Current business rule:

- Fee is not deducted at payment time.
- Fee is calculated at withdrawal time.
- Employee balance is reduced by gross requested amount.
- Employee receives net payout.
- SnapTip keeps platform fee.

Example:

- Employee balance: 100 MAD
- Withdrawal request: 100 MAD
- Platform fee: 10 MAD
- Net payout: 90 MAD
- Balance deducted: 100 MAD

Withdrawal fields added or used:

- `gross_requested_amount`
- `platform_fee_amount`
- `platform_fee_percent`
- `net_payout_amount`
- `payout_method`
- `payout_status`
- `stripe_account_id`
- `stripe_transfer_id`
- `processed_at`
- `admin_note`
- `withdrawal_source`
- `schedule_period_key`

## Stripe Connect Withdrawal Transfers

Completed changes:

- Stripe Connect withdrawals create real Stripe Transfers.
- Transfers are idempotent.
- Transfers send only `net_payout_amount`.
- Balance is deducted once.
- On Stripe transfer success:
  - withdrawal marked completed/paid
  - `stripe_transfer_id` stored
  - `processed_at` set
- On Stripe transfer failure:
  - withdrawal marked failed
  - sanitized failure reason stored
  - gross amount refunded to employee balance
  - ledger allocations released
  - user receives a friendly message

Safety:

- Uses authenticated employee id from JWT.
- Validates amount server-side.
- Requires Stripe account to be ready for payouts.
- Uses employee-level settled availability.
- Uses platform Stripe available balance only as a final safety cap.

## Employee-Level Settled Balance Ledger

Files involved:

- `server/routes/payment.js`
- `server/lib/processPayment.js`
- `server/routes/withdrawals.js`
- `server/db.js`
- `server/lib/stripeSettlementLedger.js`

Problem solved:

- Stripe platform balance is shared/fungible.
- Employees must not withdraw another employee's settled funds or SnapTip fee balance.

Completed changes:

- Payment rows track settlement metadata where available:
  - `stripe_charge_id`
  - `stripe_balance_transaction_id`
  - `available_on`
  - `settlement_status`
  - `stripe_fee_amount`
  - `net_platform_received_amount`
  - `amount_available_for_employee`
  - `amount_withdrawn_from_this_payment`
- Availability is based on the employee's own settled ledger.
- Pending payments become available when `available_on <= now`.
- Legacy rows without verifiable settlement metadata are treated conservatively unless backfilled.
- Backfill retrieves Stripe PaymentIntent, Charge, and Balance Transaction metadata safely.

Availability calculation:

- `totalBalance`: employee's current app balance.
- `employeeSettledAvailable`: employee's own settled ledger funds minus allocations/withdrawals.
- `stripeAvailableForCurrency`: platform Stripe available balance in that currency.
- `maxGrossWithdrawableFromStripe`: `stripeAvailableForCurrency / 0.90`.
- `availableToWithdraw`: `min(employeeSettledAvailable, maxGrossWithdrawableFromStripe)`.
- `pendingSettlement`: remaining funds not safely withdrawable yet.

This prevents:

- Employee A using Employee B's settled funds.
- Employee A using SnapTip fee balance.
- Employee A withdrawing pending funds because the global platform balance happens to be available.

## Withdrawal Availability UX

Files involved:

- `mobile/app/member/withdraw.tsx`
- `server/routes/withdrawals.js`

Completed changes:

- Added/updated `GET /api/withdrawals/availability`.
- Mobile withdraw screen shows:
  - Total balance
  - Available to withdraw
  - Pending settlement
- If Stripe funds are settling, the app shows an informational message instead of a scary red error.
- If user enters more than available:
  - shows a message like only X currency is currently available and the rest is settling.

Wise/manual behavior:

- Wise/manual payouts remain based on app balance and manual admin processing.
- Stripe settlement rules are not applied to Wise/manual countries.

## Withdrawal Email Notifications

Files involved:

- `server/utils/sendEmail.js`
- `server/routes/withdrawals.js`

Completed changes:

- Added non-blocking emails for withdrawal outcomes.
- Email sending happens outside DB transactions.
- Email sending is wrapped in try/catch.
- Email failure does not break financial logic.

Emails:

- Stripe Connect success:
  - sent only after transfer succeeds
  - sent after `payout_status = completed`
  - sent after `stripe_transfer_id` is stored
- Stripe Connect failure:
  - sent only after failure status is stored
  - sent only after gross amount is refunded
  - does not expose raw Stripe errors
- Wise Manual pending:
  - sent only after pending withdrawal is created

Example subjects:

- `SnapTip - Your withdrawal is on the way`
- `SnapTip - Your withdrawal was returned to your balance`
- `SnapTip - Manual payout request received`

## Withdrawal Preferences And Scheduled Payouts

Files involved:

- `mobile/app/member/withdraw.tsx`
- `mobile/lib/api.ts`
- `server/routes/withdrawals.js`
- `server/index.js`
- `server/db.js`
- `server/routes/admin.js`
- `client/src/pages/AdminDashboard.jsx`

Completed changes:

- Added withdrawal preferences UI.
- Default preference is Manual.
- Removed visible weekly/monthly/manual buttons from main withdraw screen.
- Removed main "Payout summary" card.
- Added "Withdrawal preferences" row/card with Edit button.
- Added modal to choose:
  - Manual
  - Weekly
  - Monthly
- Added copy:
  - "SnapTip fee is applied only when a withdrawal is processed."
  - "Automatic withdrawals are enabled. You can still withdraw manually anytime."

API routes:

- `GET /api/withdrawals/preferences`
- `PUT /api/withdrawals/preferences`

API rules:

- Auth required.
- Uses `req.employee.id`.
- Does not trust client-provided employee id.
- Validates only:
  - `manual`
  - `weekly`
  - `monthly`

Database fields:

- `employees.payout_schedule TEXT DEFAULT 'manual'`
- `employees.auto_payout_enabled BOOLEAN DEFAULT false`
- `employees.next_payout_at TIMESTAMP`
- `employees.last_auto_payout_at TIMESTAMP`
- `withdrawals.withdrawal_source TEXT DEFAULT 'manual'`
- `withdrawals.schedule_period_key TEXT`

Scheduler behavior:

- Started from `server/index.js` after DB initialization.
- Can be disabled with:
  - `DISABLE_SCHEDULED_PAYOUTS=true`
- Currently enabled in production:
  - `DISABLE_SCHEDULED_PAYOUTS=false`
- Default interval:
  - `SCHEDULED_PAYOUT_INTERVAL_MS || 900000`
- Uses application-level lock to avoid overlapping runs.
- Skips employee if another withdrawal is pending/processing.
- Prevents duplicate weekly/monthly payouts for the same employee and schedule period.
- Uses schedule period keys:
  - weekly: ISO week format like `2026-W22`
  - monthly: `YYYY-MM`

Auto payout behavior:

- If below minimum:
  - skip safely
  - schedule next payout
- Stripe Connect:
  - uses same safe withdrawal logic
  - employee-level ledger availability
  - Stripe platform balance final cap
  - 10% fee
  - transfers only net amount
- Wise Manual:
  - creates pending manual withdrawal
  - admin processes manually later

Failure behavior:

- Stripe transfer failure refunds balance.
- Ledger allocations are released.
- Withdrawal is marked failed.
- No immediate retry loop for same failed payout period.

## Admin Dashboard Updates

Files involved:

- `server/routes/admin.js`
- `client/src/pages/AdminDashboard.jsx`

Completed changes:

- Admin withdrawals visibility improved.
- Shows or returns:
  - payout method
  - gross amount
  - platform fee
  - net payout
  - payout status
  - Stripe transfer id
  - withdrawal source
  - schedule period key
  - next payout date where available

## Rate Limit Fix

Files involved:

- `server/middleware/rateLimit.js`

Completed changes:

- Fixed `ERR_ERL_KEY_GEN_IPV6`.
- Uses `ipKeyGenerator` from `express-rate-limit` instead of returning `req.ip` directly.

Note:

- VPS currently has a local modified `server/middleware/rateLimit.js` file. Do not overwrite it blindly.

## Admin Country/Currency List

Files involved:

- `client/src/pages/AdminDashboard.jsx`

Completed changes:

- Added missing admin dashboard countries/currencies:
  - United Kingdom GBP
  - Netherlands EUR
  - Portugal EUR
  - Belgium EUR
  - Austria EUR
  - Ireland EUR
  - Poland PLN
  - Sweden SEK
  - Switzerland CHF
  - Denmark DKK
  - Norway NOK
  - Finland EUR
  - Singapore SGD
  - Japan JPY
  - Hong Kong HKD
  - Malaysia MYR
  - Canada CAD
  - Mexico MXN
  - Australia AUD
  - New Zealand NZD

## Known Production/VPS Notes

VPS has local-only/uncommitted files that were intentionally preserved:

- `client/package-lock.json`
- `server/middleware/rateLimit.js`
- `server/package-lock.json`
- `server/snaptip.db.backup`

Do not delete or overwrite these without checking.

Latest VPS verification:

- `HEAD` equals `origin/main`.
- PM2 `snaptip` is online.
- Scheduler enabled with `DISABLE_SCHEDULED_PAYOUTS=false`.
- Scheduler log marker:
  - `[scheduled-payouts] scheduler started { intervalMs: 900000 }`
- No due employees at the time of verification.
- No recent auto withdrawals at the time of verification.

## Known Warnings / Follow-Ups

These were observed but not changed as part of the latest scheduler deployment:

- PM2 log tail still contained older historical webhook errors:
  - `inconsistent types deduced for parameter $5`
  - These appeared to be old log lines from earlier before the type-casting fix.
- PM2 log tail contains:
  - `DATA_ENCRYPTION_KEY is not set (or is too short)`
  - Withdrawal `account_details` may be written to the legacy plaintext column until this is configured.
  - Recommended future step:
    - set `DATA_ENCRYPTION_KEY` in `server/.env`
    - run `server/scripts/encrypt-legacy-withdrawals.js` if available/approved.
- Client build shows existing Vite large chunk warning.
- Mobile type check previously failed on unrelated `mobile/components/SkeletonLoader.tsx` style typing:
  - `ViewStyle | undefined` not assignable to `ViewStyle`
  - Not caused by withdrawal preference changes.

## Useful Commands

Check local state:

```bash
git status
git log --oneline -5
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

Check VPS state:

```bash
ssh root@156.67.28.181
cd /var/www/snaptip
git status
git log --oneline -5
git fetch origin main
git rev-list --count HEAD..origin/main
```

Build client on VPS:

```bash
cd /var/www/snaptip
export PATH=/root/.nvm/versions/node/v24.14.1/bin:$PATH
npm run build --prefix client
```

Restart only SnapTip:

```bash
cd /var/www/snaptip/server
/root/.nvm/versions/node/v24.14.1/bin/pm2 restart snaptip --update-env
```

Check PM2:

```bash
/root/.nvm/versions/node/v24.14.1/bin/pm2 status
/root/.nvm/versions/node/v24.14.1/bin/pm2 logs snaptip --lines 80
```

Disable scheduled payouts quickly:

```bash
cd /var/www/snaptip/server
grep -qxF 'DISABLE_SCHEDULED_PAYOUTS=true' .env || echo 'DISABLE_SCHEDULED_PAYOUTS=true' >> .env
/root/.nvm/versions/node/v24.14.1/bin/pm2 restart snaptip --update-env
```

Enable scheduled payouts:

```bash
cd /var/www/snaptip/server
sed -i 's/^DISABLE_SCHEDULED_PAYOUTS=.*/DISABLE_SCHEDULED_PAYOUTS=false/' .env
grep 'DISABLE_SCHEDULED_PAYOUTS' .env
/root/.nvm/versions/node/v24.14.1/bin/pm2 restart snaptip --update-env
```

## Recent Commit Timeline

```text
e7aa9dd feat: add withdrawal preferences and scheduled payouts
42f9792 fix: cap withdrawable balance by Stripe availability
161c226 fix: backfill Stripe settlement ledger metadata
8592916 feat: add employee-level settled payout ledger
4ef1c5e fix: cast payment money fields in webhook processing
8022bd6 feat: support multi-currency Stripe Connect payments and transfers
c75f2b9 fix: resolve withdrawal money type casting
1061cc6 feat: add withdrawal email notifications
4cce1d8 feat: add withdrawal-time platform fee logic
6faa995 fix: add Stripe onboarding return pages
ec95af4 fix: use recipient service agreement for Connect onboarding
2a58728 feat: hybrid payout onboarding (Stripe + Wise)
f0273fe fix: process Stripe tips in USD with local metadata
9bcf076 fix: handle Stripe webhooks with raw body
8ee3831 feat: add missing countries and currencies to admin dashboard
5c148ac fix: submit Stripe elements before confirming payment
07e64bb fix: restore Stripe tip payment flow
a859972 fix: use express rate limit ip key generator
31c12ea fix: repair Stripe tip payment flow
136c9c1 feat: integrate Stripe payment gateway
```
