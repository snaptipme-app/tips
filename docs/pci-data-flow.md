# PCI-DSS Data Flow & Scope (snaptip.me)

**Last reviewed:** 2026-04-29
**Audience:** founders, security reviewers, payment-processor onboarding teams.

This document describes how cardholder data (CHD) and sensitive authentication
data (SAD) flow through SnapTip and demonstrates that the application stays
out of PCI-DSS scope by never touching them.

---

## TL;DR

- SnapTip is a **SAQ A** candidate. We never process, store, or transmit CHD on
  our servers.
- All payment entry happens in the **payment processor's hosted page or
  iframe** (Stripe Checkout / Payment Element planned). The PAN never touches
  SnapTip JavaScript, the SnapTip API, the SnapTip database, or the SnapTip VPS.
- We store only opaque processor identifiers (e.g. `pi_xxx`, `ch_xxx`) and
  non-CHD metadata (amount, currency, timestamp, employee_id, optional tourist
  email).
- The current `/api/payments/mock` endpoint is for development/testing only and
  records no card data — it accepts an amount and an employee_username and
  credits the employee balance. There is no card field.

---

## Data we do NOT collect or store

| Field                           | Where it goes                          |
|---------------------------------|----------------------------------------|
| Full PAN (card number)          | Processor's hosted UI only — never us  |
| CVV / CVC                       | Processor only                         |
| Track data / chip data          | Never present in our flow              |
| PIN / PIN block                 | Never present in our flow              |
| Cardholder name on card         | Processor only                         |
| Card expiry                     | Processor only                         |

**Static analysis confirmation:** there is no field named `card_number`,
`pan`, `cvv`, `cvc`, `track`, or `pin` in any database table or API request
schema. Reviewers can verify with:

```bash
grep -RniE "card[_-]?number|\\bpan\\b|\\bcvv\\b|\\bcvc\\b" server/ client/
```

---

## What we DO store, and why

| Field (table)                                    | Sensitivity | Reason                                         |
|--------------------------------------------------|-------------|------------------------------------------------|
| `payments.amount`, `currency`, `created_at`      | Low         | Receipts, dashboard, analytics                 |
| `payments.stripe_payment_id` (planned)           | Low         | Processor-issued identifier; not CHD           |
| `payments.tourist_email` (optional)              | PII         | Receipt delivery; encrypted in transit         |
| `payments.payment_method`                        | Low         | Method label only ('mock', 'stripe_card', ...) |
| `withdrawals.account_details_enc`                | Sensitive   | Bank/wallet identifier; pgcrypto-encrypted     |
| `employees.email`, `phone_number`, `full_name`   | PII         | Account & support                              |
| `employees.password` (bcrypt hash)               | Sensitive   | Authentication                                 |
| `audit_log.ip_address`                           | PII         | Security investigation                         |

None of the above is CHD or SAD under PCI-DSS definitions.

---

## Payment data flow (target architecture, post-Stripe integration)

```
┌────────────────────┐         (1) GET /tip/:username
│  Tourist's browser │ ─────────────────────────────────────────────► snaptip.me
│  (or mobile WebView)│         returns React SPA, no card field
└─────────┬──────────┘
          │
          │ (2) Renders Stripe Payment Element
          │     (iframe directly to js.stripe.com)
          ▼
┌────────────────────────────────────────────────────────────────────┐
│  Stripe-hosted iframe — runs in Stripe's origin, isolated from us  │
│  PAN / CVV / expiry typed here NEVER reach SnapTip JavaScript.     │
└─────────┬──────────────────────────────────────────────────────────┘
          │
          │ (3) Tourist clicks "Pay" — iframe POSTs card details
          │     directly to api.stripe.com (TLS, Stripe's domain).
          ▼
┌──────────────────┐      (4) Stripe returns a payment_method_id
│  api.stripe.com  │ ──── (e.g. pm_1Abc...) to the iframe, which
└──────────────────┘      forwards an OPAQUE TOKEN to snaptip.me.

          │
          │ (5) POST /api/payments/confirm { payment_intent_id }
          ▼
┌────────────────────┐
│  snaptip.me API    │  (6) Server-side calls Stripe with
│  (Express on VPS)  │       secret key to confirm intent &
└─────────┬──────────┘       record opaque ids in DB.
          │
          │ (7) processSuccessfulPayment() updates employees.balance,
          │     inserts into payments. NO CARD DATA WRITTEN.
          ▼
┌────────────────────┐
│  PostgreSQL        │  Stores: amount, currency, payment_method_id,
│  (TLS to localhost)│   employee_id, status. CHD is NEVER inserted.
└────────────────────┘
```

**Key property:** the only line between the tourist's browser and our backend
that carries an opaque token is step (5). That token is not CHD — Stripe
defines it as a non-sensitive reference to a payment method they hold.

---

## Webhooks

`POST /api/payments/webhook` ([server/routes/payments.js:168](../server/routes/payments.js#L168))
will receive Stripe-signed JSON events (`payment_intent.succeeded`, etc).

- Verify the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`.
- Use `express.raw({ type: 'application/json' })` so the signature still
  validates (already wired).
- Webhook payloads contain only Stripe-issued ids and amounts — never CHD.

---

## Compensating controls (defence in depth)

These are not strictly required for SAQ A, but documented here as part of our
overall security posture:

1. **HTTPS everywhere** — TLS 1.2+ at the Cloudflare edge, TLS 1.2+ at the
   origin. See [docs/cloudflare-checklist.md](cloudflare-checklist.md).
2. **Strict CSP** — script-src restricted to `'self'` plus js.stripe.com when
   Stripe is enabled. Defined in [client/vite.config.js](../client/vite.config.js).
3. **Secret management** — Stripe keys live in `server/.env` only,
   permission `0600`, never committed. Loaded via `dotenv`.
4. **Audit logging** — every payment-related action is recorded with
   `logFromReq()` (see [server/lib/audit.js](../server/lib/audit.js)).
5. **Rate limits** — `/api/payments/*` is rate-limited at the application
   layer (express-rate-limit) and at the Cloudflare edge.
6. **Database hardening** — pgcrypto, least-privilege role, encrypted backups
   (see [docs/db-hardening.md](db-hardening.md) if present).

---

## Out-of-scope items reviewers may ask about

| Item                                          | Status                                   |
|-----------------------------------------------|------------------------------------------|
| PAN displayed in admin dashboard              | Not displayed — we have no PAN to show.  |
| PAN searchable in DB                          | Not searchable — no PAN column exists.   |
| PAN in logs                                   | Impossible — no PAN ever reaches server. |
| PAN in email receipts                         | Last-4 only when supplied by Stripe.     |
| Quarterly ASV scan                            | Cloudflare WAF + manual review for now;  |
|                                               | engage an ASV before processing live $.  |
| Annual penetration test                       | TBD — required if scope expands.         |

---

## Self-assessment questionnaire

We expect to qualify for **SAQ A** because:

- [x] We outsource ALL CHD functions to a PCI-DSS validated third party
      (Stripe is a Level 1 service provider).
- [x] We do not store, process, or transmit any CHD on our systems.
- [x] We have confirmed no PAN/CVV/etc fields exist anywhere in our code or
      database (see grep above).
- [x] We use the processor's hosted/iframe payment UI, not our own form.

If we ever embed our own card form (custom PAN field) we move to **SAQ A-EP**
or higher and must engage a QSA. **Do not implement a custom card form.**

---

## Change log

- 2026-04-29 — Initial document. Stripe integration not yet wired; current
  payment flow is `/api/payments/mock` (no card data of any kind).
