# Cloudflare Hardening Checklist (snaptip.me)

Cloudflare settings live outside the repo. This checklist is the canonical
source of what *should* be on. Audit it whenever someone touches the dashboard.

Last reviewed: 2026-04-29

## SSL / TLS

- [ ] **SSL/TLS encryption mode**: Full (strict)
  *Path:* SSL/TLS → Overview
  *Why:* Validates the origin's certificate. Anything less than strict allows
  a MITM with a self-signed cert at the origin to succeed silently.

- [ ] **Minimum TLS Version**: TLS 1.2
  *Path:* SSL/TLS → Edge Certificates
  *Why:* TLS 1.0/1.1 have known weaknesses (BEAST, POODLE remnants).

- [ ] **Always Use HTTPS**: ON
  *Path:* SSL/TLS → Edge Certificates → Always Use HTTPS
  *Why:* 301-redirects every plain-HTTP request before the origin sees it.

- [ ] **HTTP Strict Transport Security (HSTS)**: enabled
  *Path:* SSL/TLS → Edge Certificates → HTTP Strict Transport Security
  *Settings:*
  - Max Age Header: 12 months (31536000)
  - Include subdomains: ON
  - Preload: ON  (after verifying both `snaptip.me` and `www.snaptip.me`
    serve HTTPS reliably; submit at https://hstspreload.org once confident)
  - No-Sniff: ON
  *Why:* Locks browsers to HTTPS for the next year, even if Cloudflare is
  bypassed.

- [ ] **TLS 1.3**: Enabled (default)

- [ ] **Authenticated Origin Pulls**: enabled (recommended, optional)
  *Path:* SSL/TLS → Origin Server → Authenticated Origin Pulls
  *Why:* Origin only accepts requests signed by Cloudflare — blocks
  attackers who discover the origin IP.

## Security

- [ ] **Bot Fight Mode**: ON
  *Path:* Security → Bots
  *Why:* Free tier mitigation against scrapers and credential stuffing.

- [ ] **WAF Managed Rules**: enable Cloudflare Managed Ruleset + OWASP Core
      Ruleset
  *Path:* Security → WAF → Managed rules
  *Settings:* default sensitivity (medium). Override `OWASP Core Ruleset`
  paranoia level to PL2.
  *Why:* OWASP catches generic injection / path-traversal patterns even if a
  bug slips into the API.

- [ ] **Rate Limiting Rules**: enabled
  *Path:* Security → WAF → Rate limiting rules
  *Recommended baseline:*
  - `rate-limit-auth`     — 10 req / 60s, scope: `(http.request.uri.path
    matches "^/api/auth/")`, action: block 1h
  - `rate-limit-admin`    — 5  req / 60s, scope: `(http.request.uri.path
    matches "^/api/admin/login")`, action: block 1h
  - `rate-limit-payments` — 30 req / 60s, scope: `(http.request.uri.path
    matches "^/api/payments/")`, action: managed challenge
  *Why:* Edge-layer rate limiting absorbs brute-force attacks before they
  reach the origin's express-rate-limit.

- [ ] **DDoS protection**: automatic (always on for paid plans, baseline on
      free)
  *Path:* Security → DDoS

- [ ] **Browser Integrity Check**: ON
  *Path:* Security → Settings
  *Why:* Catches obvious user-agent / header anomalies.

- [ ] **Security Level**: Medium
  *Path:* Security → Settings
  *Why:* High blocks legitimate users behind shared NAT (e.g. corporate VPN).

- [ ] **Challenge Passage**: 30 minutes
  *Path:* Security → Settings

- [ ] **Block known bad ASNs / countries** (optional)
  *Path:* Security → WAF → Custom rules
  *Example:* drop traffic from `(ip.geoip.country in {"RU" "KP"})` if your
  user base has zero presence there. Verify with audit_log first.

## Caching & response headers

- [ ] **Server header**: stripped
  *Path:* Rules → Transform Rules → Modify Response Header
  *Action:* Remove `server` (and `x-powered-by` if present).
  *Why:* Stops fingerprinting nginx + node version. Defense in depth on top
  of `server_tokens off` in nginx and Express's `X-Powered-By` removal.

- [ ] **Add response headers** (defense in depth — server should set them too):
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

- [ ] **Disable directory browsing**: handled by nginx (`autoindex off`).
      Cloudflare cannot enforce this on its own — it caches whatever the
      origin returns. Verify by hitting `https://snaptip.me/uploads/` and
      confirming a 404, not a directory listing.

## DNS

- [ ] **Proxy status**: orange cloud (Proxied) on the apex `snaptip.me` and
      `www.snaptip.me` records. NEVER unproxy these — that exposes the
      origin IP and bypasses every protection above.
- [ ] **CAA record**: `0 issue "letsencrypt.org"` (or whichever CA you use).
      Stops other CAs from issuing certs for the domain.
- [ ] **DNSSEC**: enabled (DNS → Settings → DNSSEC).

## Verification

After applying everything, run from a clean network:

```bash
curl -I https://snaptip.me/api/health
# Expect: server header absent or "cloudflare"
# Expect: strict-transport-security present
# Expect: x-content-type-options: nosniff

curl -k -I --resolve snaptip.me:443:<origin-ip> https://snaptip.me/
# Expect: connection refused or 403 (Authenticated Origin Pulls did its job),
#         OR plain 200 if AOP isn't enabled (acceptable, but document why).
```

Then test with https://securityheaders.com/?q=https%3A%2F%2Fsnaptip.me — aim
for an A grade or better.
