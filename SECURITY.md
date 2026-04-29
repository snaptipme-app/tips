# SnapTip Security Policy

**Last reviewed:** 2026-04-29
**Contact:** security@snaptip.me
**Audience:** developers, operators, security researchers, auditors.

This document is the canonical security reference for SnapTip. It covers our
threat model, the controls we have in place across the stack, our vulnerability
disclosure policy, our incident response runbook, and our secret-rotation
procedure. It also serves as a summary of the security work completed across
hardening Phases 1-7.

For per-area depth, see:
- [docs/db-hardening.md](docs/db-hardening.md) — database controls
- [docs/cloudflare-checklist.md](docs/cloudflare-checklist.md) — Cloudflare config
- [docs/pci-data-flow.md](docs/pci-data-flow.md) — PCI-DSS scope
- [docs/pentest-checklist.md](docs/pentest-checklist.md) — manual pen-test list
- [docs/automated-testing.md](docs/automated-testing.md) — CVE / scanner commands
- [deploy/nginx-snaptip.conf](deploy/nginx-snaptip.conf) — nginx config
- [scripts/vps-harden.sh](scripts/vps-harden.sh) — VPS bootstrap

---

## 1. Reporting a vulnerability

If you believe you have found a security vulnerability in SnapTip, please email
**security@snaptip.me** with:

- A clear description of the issue and the impact you believe it has.
- Steps to reproduce, or a proof-of-concept (small, non-destructive).
- Any logs, screenshots, or HTTP traces that help us reproduce.
- Your name / handle if you would like credit.

**Please do NOT:**
- Publicly disclose the issue before we have had a chance to fix it.
- Run automated scanners against production without prior authorization.
- Test on real user accounts that are not your own.
- Attempt denial-of-service, social engineering, or physical attacks.

**What we promise:**
- Acknowledge your report within **3 business days**.
- Provide an initial triage and severity assessment within **7 business days**.
- Keep you informed of progress at least every 14 days.
- Credit you in release notes (with your consent) for confirmed valid reports.
- Treat good-faith research within these rules as authorized — we will not
  pursue legal action.

We do not currently run a paid bug-bounty program, but we may award discretionary
swag or vouchers for high-impact findings.

---

## 2. Threat model

### Assets we protect

| Asset                                     | Why it matters                            |
|-------------------------------------------|-------------------------------------------|
| Employee account credentials              | Account takeover → withdraw funds         |
| Tip transaction records                   | Tax / accounting integrity                |
| Withdrawal account details (IBAN/RIB/etc) | Financial fraud if leaked                 |
| Employee balances                         | Direct financial loss                     |
| Admin panel access                        | Platform-wide control                     |
| Audit logs                                | Forensic / compliance integrity           |
| Operator SSH access to VPS                | Full system compromise                    |
| TLS / signing keys                        | Cert misissuance, JWT forgery             |
| Stripe API keys (when enabled)            | Direct financial fraud                    |

### Adversaries we plan for

1. **Opportunistic scanners** (botnets, mass exploit kits) — block at edge.
2. **Credential-stuffing / brute-force attackers** — rate limit + audit.
3. **Targeted attackers** seeking employee or admin accounts — defense in depth.
4. **Malicious tourists** abusing the public tip endpoint — input validation, rate limit.
5. **Malicious authenticated employees** trying to access other employees' data — IDOR checks, audit logging.
6. **Compromised dependencies** — `npm audit`, lockfiles, minimal direct deps.
7. **Insiders / lost devices** — secret rotation procedure (§5).
8. **Network-level adversaries** — TLS everywhere, HSTS preload, AOP.

### Adversaries explicitly out of scope

- Nation-state actors with arbitrary code-execution on the operator's laptop.
- Physical attacks on the data centre.
- Side-channel attacks on shared cloud hardware below our hypervisor.

### Trust boundaries

```
[Tourist browser]
      │ (HTTPS)
      ▼
[Cloudflare edge]  ─── trust boundary 1 ───▶ [VPS origin (nginx)]
                                                    │
                                       trust boundary 2
                                                    ▼
                                            [Express on 127.0.0.1:5000]
                                                    │
                                                    ▼
                                            [PostgreSQL on 127.0.0.1:5432]
```

- The VPS treats the public Internet (and even Cloudflare) as untrusted —
  rate limits, WAF, body validation are applied at every boundary.
- The Express layer treats the database as trusted-but-not-naive (parameterized
  queries always; least-privilege role planned).
- The mobile app and web client treat the API as the source of truth for
  authorization decisions; no security-relevant logic lives client-side.

---

## 3. Controls in place — by layer

### 3.1 Network edge (Cloudflare)
- Full strict TLS, TLS 1.2+ minimum.
- Always Use HTTPS; HSTS with `max-age=31536000; includeSubDomains; preload`.
- WAF Managed Ruleset + OWASP Core Ruleset (PL2).
- Rate-limit rules on `/api/auth/*`, `/api/admin/login`, `/api/payments/*`.
- Bot Fight Mode + Browser Integrity Check.
- DNS: orange-cloud proxied apex, CAA pinned to Let's Encrypt, DNSSEC on.
- Authenticated Origin Pulls (recommended) so the origin only accepts
  Cloudflare-signed requests.

Source of truth: [docs/cloudflare-checklist.md](docs/cloudflare-checklist.md).

### 3.2 VPS / OS
- UFW: default deny incoming; allow only the new SSH port + 80 + 443.
- sshd: key-only auth, root login disabled, custom port, `MaxAuthTries 3`,
  `LoginGraceTime 30`, `ClientAliveInterval 300`.
- fail2ban: jails for sshd, nginx-http-auth, nginx-botsearch.
- unattended-upgrades enabled for security-only origin set.

Source of truth: [scripts/vps-harden.sh](scripts/vps-harden.sh).

### 3.3 nginx
- `server_tokens off`; `proxy_hide_header Server` and `X-Powered-By`.
- 10 MB body limit; slowloris timeouts.
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy.
- Per-IP `limit_req_zone` for general API and login.
- Exploit-path blocks (`.env`, `.git`, `.bak`, `phpmyadmin`, `wp-login`, ...).
- `/uploads` served as alias with autoindex off; PHP/script execution
  explicitly denied even if the upload validation regresses.
- 80→443 redirect with ACME challenge passthrough.

Source of truth: [deploy/nginx-snaptip.conf](deploy/nginx-snaptip.conf).

### 3.4 Express / Node
- `helmet()` with CSP-friendly defaults.
- `hpp()` to neutralize HTTP parameter pollution.
- `cors()` with explicit allowlist (no `*`).
- `compression()` configured to skip already-compressed responses.
- `cookie-parser` + httpOnly + Secure + SameSite=Strict for the admin auth cookie.
- `express-rate-limit` on `/api/auth/*` and admin routes (defense in depth on
  top of Cloudflare).
- All SQL via parameterized `$1, $2` placeholders; zero string concatenation
  in any query.
- Audit logging via `lib/audit.js` is best-effort and never propagates errors
  to the caller — we log on success and failure paths.
- Real-time auth checks: every authenticated request re-queries `is_suspended`
  and `deleted_at` from the DB so a JWT can be revoked instantly.

### 3.5 Database (PostgreSQL)
- pgcrypto extension for field-level encryption on sensitive columns
  (`withdrawals.account_details_enc`).
- `audit_log` append-only table with hot indexes on `created_at`, `action`,
  `(actor_type, actor_id)`.
- Connection over TCP loopback only; remote access disabled.
- Backup encryption (operator runbook in [docs/db-hardening.md](docs/db-hardening.md)).
- Least-privilege application role planned (currently single role).

### 3.6 Web client (React / Vite)
- Strict CSP injected at build time via `transformIndexHtml`:
  `default-src 'self'; script-src 'self'; ... frame-ancestors 'none';
  upgrade-insecure-requests`.
- Frame-buster IIFE in `main.jsx` (CSP `frame-ancestors` is ignored when set
  via meta, so we ship a runtime guard).
- React JSX auto-escapes user-supplied strings; no `dangerouslySetInnerHTML`.
- Privacy + Terms pages live above the `/:username` catch-all so they cannot
  be shadowed.
- Cookie consent banner (one essential cookie only — no third-party trackers).

### 3.7 Mobile (React Native / Expo)
- Tokens stored in `expo-secure-store` (Keychain / Keystore), never AsyncStorage.
- Deep links validated against an allowlist; unknown schemes rejected.
- Screenshot prevention on auth & withdrawal screens.
- Android Network Security Config enforces TLS to `snaptip.me` only.

### 3.8 Compliance
- GDPR Article 17 (erasure): `POST /api/employee/delete-account` →
  soft-delete + email recovery code; hard-purge cron after 30 days.
- GDPR Article 20 (portability): `GET /api/employee/export-data` returns a
  JSON dump of the authenticated user's data.
- GDPR Article 16 (rectification): standard profile edit endpoints.
- CCPA: same machinery satisfies the right-to-delete and the right-to-know.
- PCI-DSS: SAQ A path — no PAN, CVV, track, or PIN data ever touches our
  systems. Verified by code search and database schema review. See
  [docs/pci-data-flow.md](docs/pci-data-flow.md).

---

## 4. Incident response runbook

Use this when a security incident is suspected or confirmed.

### 4.1 Define the trigger

You are in incident-response mode if **any** of:
- Unauthorized access to an admin or employee account is suspected.
- Database integrity is in question (unexpected rows, balance changes).
- A vulnerability with known active exploitation is reported.
- A secret (env var, SSH key, JWT secret, Stripe key) is suspected leaked.
- The platform is being actively abused (DDoS, credential stuffing flood).

### 4.2 First 30 minutes — contain

1. **Page the on-call operator.** Do not act alone on production.
2. **Isolate** the affected component:
   - Account takeover suspected → suspend the account: `UPDATE employees SET is_suspended = 1 WHERE id = $1` and log it.
   - Compromised admin → rotate `JWT_SECRET` and `ADMIN_PASSWORD_HASH`
     (every admin session is invalidated by §5.2).
   - Compromised VPS → block all inbound at Cloudflare (Under Attack mode +
     custom block-all rule), rotate SSH key, snapshot disk before any cleanup.
3. **Preserve evidence** — DO NOT `rm` or `truncate` anything yet:
   - Snapshot the VPS volume.
   - Dump `audit_log` for the last 7 days to a separate file.
   - Save `nginx access.log` + `error.log` and pm2 logs.
   - Capture `last`, `who`, `ss -tnp` output.

### 4.3 Hours 1-4 — assess

1. Determine **scope**: which accounts, which data, which time window.
2. Determine **vector**: phishing? credential stuffing? exploited bug? lost laptop?
3. Determine **persistence**: rogue cron job? backdoor user? webshell in `/uploads`?
   - `find /var/www -newer /tmp/incident-start -type f`
   - `crontab -l` for every account; `cat /etc/cron.*/*`
   - `ls -la /uploads/` looking for non-image files
4. Determine **legal obligations**:
   - GDPR: data breach involving personal data → notify supervisory authority
     within **72 hours** (Article 33). High risk to rights & freedoms → notify
     the affected users (Article 34).
   - PCI-DSS: notify the card brands and acquiring bank if CHD is implicated
     (does not currently apply — see [docs/pci-data-flow.md](docs/pci-data-flow.md)).

### 4.4 Hours 4-24 — eradicate

1. Patch the underlying vulnerability — write the regression test first.
2. Rotate every secret that was within blast radius (see §5).
3. Force-logout affected users by rotating `JWT_SECRET`.
4. Revert any malicious DB writes from a clean backup; reconcile balances.
5. Rebuild the VPS from scratch from a known-good IaC config if compromise of
   the host itself is suspected. Do not trust an "in-place clean".

### 4.5 Days 1-7 — recover

1. Bring users back online with forced password reset where appropriate.
2. Send breach notifications (privacy@snaptip.me drafts; legal review).
3. Public statement on the status page if the incident affected availability
   or data confidentiality.
4. Re-run the post-deploy verification checks (§7 below).

### 4.6 After — learn

1. Write a blameless post-mortem within 5 business days. Required sections:
   - Timeline (UTC, with sources).
   - Root cause (technical and process).
   - What we missed and why.
   - What changed in code, config, or process to prevent recurrence.
   - Customer impact: number of accounts, data classes touched.
2. Add detection for the failed mode — alert, log, dashboard, or test.
3. Update this runbook with whatever was missing.

---

## 5. Secret rotation procedure

Run this drill at least **every 90 days**, after any operator turnover, and
immediately after any suspected compromise.

### 5.1 Inventory

Secrets currently in use (audit annually):

| Secret                       | Where stored                          | Rotation impact                          |
|------------------------------|---------------------------------------|------------------------------------------|
| `JWT_SECRET`                 | server/.env                           | All employee + admin tokens invalidated  |
| `ADMIN_PASSWORD_HASH`        | server/.env                           | Admin must log in with new password      |
| `DATA_ENCRYPTION_KEY`        | server/.env                           | New writes use new key; old reads still work via legacy column. See `lib/cryptoFields.js` |
| `DATABASE_URL` password      | server/.env + Postgres role           | Coordinate restart                       |
| `EMAIL_USER` / `EMAIL_PASS`  | server/.env (Brevo)                   | Issue new SMTP key in Brevo dashboard    |
| `STRIPE_SECRET_KEY` (planned) | server/.env                          | Roll in Stripe dashboard, deploy new env |
| `STRIPE_WEBHOOK_SECRET`      | server/.env                           | Roll on Stripe webhook page              |
| Cloudflare API token          | operator's password manager           | Roll in CF dashboard; redeploy any IaC   |
| SSH private key (operator)    | operator's laptop                     | Replace authorized_keys; re-run vps-harden if needed |
| Let's Encrypt account key     | /etc/letsencrypt on VPS               | Rare — only if VPS is rebuilt            |

### 5.2 Rotating `JWT_SECRET`

```bash
# 1. Generate a new secret
NEW=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")

# 2. Update server/.env on the VPS
sudo sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW|" /var/www/snaptip/server/.env

# 3. Restart node — every existing token is now invalid
sudo -u snaptip pm2 restart snaptip

# 4. Verify
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <old token>" \
  https://snaptip.me/api/employee/me   # expect 401
```

### 5.3 Rotating `DATA_ENCRYPTION_KEY`

The encryption helper falls back to plaintext for legacy reads, so you can
roll the key without downtime:

```bash
# 1. Generate
NEW=$(openssl rand -base64 48)

# 2. Update env
sudo sed -i "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$NEW|" /var/www/snaptip/server/.env
sudo -u snaptip pm2 restart snaptip

# 3. Re-encrypt rows previously written under the old key
node server/scripts/encrypt-legacy-withdrawals.js   # idempotent, safe to re-run
```

### 5.4 Rotating SSH access

```bash
# As the new operator
ssh-keygen -t ed25519 -C "snaptip-ops-$(date +%Y%m%d)"

# As current operator (still logged in)
echo "<new-pubkey>" | sudo tee -a /home/<deploy-user>/.ssh/authorized_keys

# New operator verifies they can log in. THEN remove the old key:
sudo sed -i '/<old-key-fingerprint>/d' /home/<deploy-user>/.ssh/authorized_keys
```

If the laptop holding the only SSH key is compromised:
1. Use the cloud provider's web console to add a temporary key.
2. Remove the compromised key from `authorized_keys`.
3. Rotate every other secret in the inventory — assume the laptop also had
   a copy of `.env`.

### 5.5 Rotation log

Keep a private log (one entry per rotation) with: secret name, date,
operator, reason. We do not commit this to git.

---

## 6. Automated testing

See [docs/automated-testing.md](docs/automated-testing.md) for the full
command list. Quick reference:

```bash
# Server-side dependency CVE check
( cd server && npm audit --omit=dev )
( cd server && npm audit fix )                  # safe-only fixes
( cd server && npm audit fix --force )          # ONLY after manual review

# Client-side dependency CVE check
( cd client && npm audit )

# Mobile app
( cd snaptip-mobile && npm audit )

# Lint + syntax check (per phase)
node --check server/server.js
( cd client && npm run build )
```

CI runs these on every PR; the `npm audit` job fails the build on any
high-or-above advisory.

---

## 7. Post-deploy verification

Run after any production push. This is the smoke test that catches the
common regressions.

| Step | What to do                                                             | Expected                                          |
|------|------------------------------------------------------------------------|---------------------------------------------------|
| 1    | `curl -I https://snaptip.me/`                                          | `200`, HSTS header, no `Server` header           |
| 2    | `curl https://snaptip.me/api/health`                                   | `{"status":"ok"}`                                |
| 3    | Log in as a test employee                                              | Cookie set, dashboard loads                       |
| 4    | Send a tip via `/:username` page                                       | Balance increases by tip amount                   |
| 5    | Request a withdrawal                                                   | Row appears in admin panel                        |
| 6    | Hit `/api/admin/login` with wrong creds 6 times                        | 6th attempt rate-limited                          |
| 7    | `curl https://snaptip.me/.env`                                         | `403`                                             |
| 8    | Visit `/privacy` and `/terms`                                          | Pages render                                      |
| 9    | Trigger `POST /api/employee/export-data` with a valid token            | JSON download                                     |
| 10   | `node server/scripts/purge-deleted-accounts.js` (dry run)              | Lists candidates, exits 0                         |

---

## 8. Phase-by-phase change summary

A condensed history of the security work this repo has undergone. Each phase
shipped as one commit; see `git log --grep "security"` for full diffs.

| Phase | Scope                                  | Key deliverables                                                                                  |
|-------|----------------------------------------|---------------------------------------------------------------------------------------------------|
| 1.1   | Express middleware                     | helmet, hpp, compression, cookie-parser, CORS allowlist, body-size limits                          |
| 1.2   | Rate limiting                          | express-rate-limit on `/api/auth/*` and admin routes                                              |
| 1.3   | Audit logging                          | `audit_log` table + `lib/audit.js` best-effort logger; `logFromReq` shim                          |
| 1.4   | Input validation                       | Per-route schema checks; safe parsing of amounts/identifiers                                       |
| 1.5   | SQL audit                              | Confirmed all queries parameterized; zero string-built SQL                                         |
| 1.6   | Auth hardening                         | Real-time DB checks for `is_suspended`; bcrypt rounds reviewed                                     |
| 1.7-1.9, 1.12 | Misc (uploads, error sanitization, secret hygiene) | multer limits, generic error responses, `.env` gitignored, server emits no version banner |
| 1.10  | Helmet config polish                   | CSP-compatible defaults, frameguard DENY                                                          |
| 1.11  | TLS posture                            | Origin certs via certbot, redirect 80→443                                                         |
| 2     | Mobile (React Native / Expo)           | expo-secure-store, deep-link allowlist, screenshot block, Android Network Security Config         |
| 3     | Web client                             | Strict CSP via Vite plugin, frame-buster IIFE, admin httpOnly cookie auth, CSRF token              |
| 4     | Database                               | pgcrypto, encrypted withdrawal account details, `audit_log` with hot indexes                       |
| 5     | Infrastructure                         | `vps-harden.sh`, Cloudflare checklist, hardened nginx config                                       |
| 6.1   | GDPR / CCPA                            | `deleted_at`, `/export-data`, `/delete-account`, `/recover-account`, purge cron, Privacy + Terms pages, cookie banner |
| 6.2   | PCI-DSS                                | Data-flow doc proving SAQ A scope                                                                  |
| 7     | Documentation & testing                | This `SECURITY.md`, `docs/automated-testing.md`, `docs/pentest-checklist.md`                       |

---

## 9. Known residual risks

These are tracked here so a future operator does not assume they are solved.

1. **Single application DB role.** We currently use one Postgres role with
   schema-modify privileges. Plan: split into `snaptip_app` (DML only) and
   `snaptip_migrate` (DDL); only the migrate role can run on deploy.
2. **No automated DR drill.** Backups are taken; restoration has not been
   exercised end-to-end recently. Plan: quarterly restore-to-staging drill.
3. **No quarterly ASV scan.** Required if/when we move beyond SAQ A.
4. **Single-region deployment.** Loss of the VPS region = downtime. Acceptable
   for current traffic; revisit at scale.
5. **Admin 2FA not yet enforced.** Admin login uses a password + httpOnly
   cookie + Cloudflare rate limit. TOTP-based 2FA is on the roadmap.
6. **Stripe integration pending.** Payments currently go through
   `/api/payments/mock`. The PCI-DSS scope claims (§3.8) hold today *and*
   will continue to hold once Stripe is wired with the hosted Payment
   Element — but a custom card form would change scope dramatically. Do not
   build one.
7. **Client bundle size.** `index.js` is ~1 MB unminified post-build. Not a
   security issue today but increases the attack surface of any compromised
   CDN edge. Plan: code-split the admin dashboard.
8. **Push notification token retention.** `push_token` is stored indefinitely
   on the employee row. We should clear it on logout and on account deletion
   (deletion is handled by the GDPR purge; logout clearing is open).

---

## 10. Versioning

This document is versioned with the codebase. When you change a control,
update the relevant section here in the same PR. Reviewers should reject
security-relevant changes that do not update `SECURITY.md`.
