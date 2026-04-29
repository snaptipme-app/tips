# Automated security testing — commands & playbook

**Last reviewed:** 2026-04-29

This is the operator's reference for security-related automated checks. Run
the commands by hand for now; CI integration is a follow-up.

> **Do NOT run any active scanner against production without explicit sign-off
> from the platform owner.** ZAP / sqlmap / nuclei traffic looks identical to
> a live attack and will trip Cloudflare WAF and fail2ban.

---

## 1. Dependency CVE scan (`npm audit`)

Run for **each** package boundary:

```bash
( cd server && npm audit )                # backend
( cd client && npm audit )                # web client
( cd snaptip-mobile && npm audit )        # mobile (if path differs, adjust)
```

### Interpreting output

`npm audit` reports findings by severity. Our policy:

| Severity   | Action                                                 | SLA          |
|------------|--------------------------------------------------------|--------------|
| critical   | Fix or hot-patch immediately. Block deploys.           | < 24h        |
| high       | Fix in the next deploy.                                | < 7 days     |
| moderate   | Fix in the next maintenance window.                    | < 30 days    |
| low / info | Track but do not block.                                | next quarter |

### Safe automatic remediation

```bash
( cd server && npm audit fix )            # only patch & minor bumps within semver
```

### When `--force` is needed

`npm audit fix --force` may bump majors and break the build. Procedure:

1. Take a backup branch: `git checkout -b deps/audit-force-$(date +%Y%m%d)`.
2. Run `npm audit fix --force` in one package only at a time.
3. Run the full smoke test (login, register, send tip, withdrawal, admin).
4. Diff `package.json` and review every major bump for breaking changes.
5. Open a PR explaining each bump in the description.

### Suppressing false positives

We do NOT add `npm audit --omit=dev` to mask findings. Dev-only advisories
are tracked but not deploy-blocking — drop them with explicit justification
in `package.json#"npm-audit-ignore"` and review quarterly.

---

## 2. Outdated package check (`npm outdated`)

```bash
( cd server && npm outdated )
( cd client && npm outdated )
```

Run monthly. Aging deps grow unreviewed CVE risk even when `npm audit` is
clean today. We don't auto-bump majors — those require a focused PR.

---

## 3. Static analysis

### Server (Node)

```bash
# Syntax-only — fast, runs in CI
find server -name '*.js' -not -path '*/node_modules/*' \
  -exec node --check {} \;
```

### Client (Vite/React)

```bash
( cd client && npm run build )    # treats type errors / unused vars as warnings
( cd client && npm run lint )     # if configured
```

### Secret-leak scan

Run before every push to a public branch:

```bash
# Quick local scan with ripgrep — heuristic, not exhaustive.
rg -nE '(AKIA|sk_live_|whsec_|-----BEGIN [A-Z ]+PRIVATE KEY-----|api[_-]?key|secret)' \
   --hidden -g '!*.lock' -g '!node_modules' -g '!.git'
```

For a more thorough scan, install `gitleaks`:

```bash
gitleaks detect --source . --no-git -v
```

If a secret was committed: rotate it (per [SECURITY.md](../SECURITY.md) §5),
then rewrite history with `git filter-repo`. Force-push only after the
secret has been rotated — until then, the leaked value is still valid.

---

## 4. HTTP security headers

After every deploy:

```bash
curl -sI https://snaptip.me/ | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'
```

Then run https://securityheaders.com/?q=https%3A%2F%2Fsnaptip.me — aim for
grade A. Document any deviation in [SECURITY.md](../SECURITY.md) §9.

---

## 5. TLS configuration

After every deploy and at least quarterly:

- https://www.ssllabs.com/ssltest/analyze.html?d=snaptip.me — aim for A or A+.
- `nmap --script ssl-enum-ciphers -p 443 snaptip.me` — verify TLS 1.0/1.1
  refused, only AEAD ciphers offered.

---

## 6. Active web scanners — STAGING ONLY

Run these against a staging environment that mirrors prod, never against
prod. Whitelist your IP at Cloudflare for the duration of the test.

### OWASP ZAP (free, open source)

Recommended baseline scan against the SPA + API:

```bash
# Pull the official Docker image
docker pull ghcr.io/zaproxy/zaproxy:stable

# Baseline (passive) — safe-ish, no fuzzing
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.snaptip.me -r zap-baseline.html

# Full active scan — DO NOT run against prod
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t https://staging.snaptip.me -r zap-full.html
```

Areas ZAP catches well: missing security headers, mixed content, common
XSS patterns, weak session management, insecure cookies, redirects to
external hosts. It misses: business-logic flaws, IDOR on resource ids,
auth bypass that requires staged inputs.

### Burp Suite Community

Manual exploration with Burp's intercepting proxy is the highest-yield
technique for our stack. Use Repeater + Intruder to:
- Replay an authenticated request with another user's `id` to find IDOR.
- Replay a member request against a manager-only endpoint to find privilege
  escalation.
- Fuzz `Authorization` header with malformed JWTs (see pen-test checklist
  §8 for specific payloads).

Burp Community lacks the active scanner; pair it with ZAP for that layer.

### nuclei (templates)

```bash
# Latest templates
nuclei -update-templates

# Run only safe categories against staging
nuclei -u https://staging.snaptip.me \
       -tags "cve,exposure,misconfiguration" \
       -severity high,critical -rate-limit 5
```

The `-rate-limit 5` keeps us friendly with staging fail2ban.

---

## 7. SQL injection — sqlmap

Targeted, NOT prod, with explicit consent. The repo's queries are
parameterized so we expect zero findings, but this is the regression test:

```bash
# One example — repeat for every endpoint that takes a user-supplied ID.
sqlmap -u "https://staging.snaptip.me/api/payments/history/1" \
       --cookie="snaptip_admin=<staging-token>" \
       --level=3 --risk=2 --batch --random-agent
```

If sqlmap reports anything other than "all tested parameters do not appear
to be injectable", treat it as a P0 incident.

---

## 8. CI integration (planned)

The following targets should run on every PR:

```yaml
# Pseudo-config. Adapt to your runner.
steps:
  - run: ( cd server && npm ci && npm audit --audit-level=high )
  - run: ( cd client && npm ci && npm run build )
  - run: ( cd snaptip-mobile && npm ci && npm audit --audit-level=high )
  - run: gitleaks detect --source . --redact -v
```

Until CI is wired, the developer is the gate. Run the dependency commands
above before opening any PR that bumps `package.json`.
