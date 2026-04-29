# Database Hardening Runbook (PostgreSQL)

This document captures the one-time DBA steps required to deploy Phase 4
(Database hardening). The application code in this repo runs as the unprivileged
`snaptip` role described below. The runbook commands themselves must be run by
a superuser (typically `postgres` over a local socket or via `sudo -u postgres
psql snaptip`).

Skip nothing — every section below was deliberate.

---

## 1. Roles and least-privilege grants

The application connects as `snaptip`. It must be able to read and write
application data, and nothing else. In particular it MUST NOT be able to
`CREATE DATABASE`, `CREATE ROLE`, alter the schema, or read the system
catalogues.

A separate read-only role (`snaptip_readonly`) is provided for ad-hoc analytics,
external BI tooling, and on-call investigation. It cannot mutate any data.

```sql
-- ── Application role ─────────────────────────────────────────────────
-- Replace the password and store it in DATABASE_URL in server/.env.
CREATE ROLE snaptip LOGIN PASSWORD 'replace-with-a-long-random-string'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;

-- Grant connect + schema usage. The schema itself stays owned by `postgres`.
GRANT CONNECT ON DATABASE snaptip TO snaptip;
GRANT USAGE ON SCHEMA public TO snaptip;

-- DML on every existing table.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO snaptip;
GRANT USAGE,  SELECT, UPDATE          ON ALL SEQUENCES IN SCHEMA public TO snaptip;

-- And on every table that future migrations create. Without this clause the
-- runtime user loses access to any new table the moment it is created by a
-- migration tool running as a different role.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO snaptip;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE,  SELECT, UPDATE          ON SEQUENCES TO snaptip;

-- ── Read-only role (analytics / on-call) ─────────────────────────────
CREATE ROLE snaptip_readonly LOGIN PASSWORD 'replace-with-a-long-random-string'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;

GRANT CONNECT  ON DATABASE snaptip TO snaptip_readonly;
GRANT USAGE    ON SCHEMA public    TO snaptip_readonly;
GRANT SELECT   ON ALL TABLES IN SCHEMA public TO snaptip_readonly;
GRANT SELECT   ON ALL SEQUENCES IN SCHEMA public TO snaptip_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO snaptip_readonly;
```

### Verify

After running the grants above, sanity-check:

```sql
-- Should list ONLY tables in the public schema, with the four DML privileges.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'snaptip'
ORDER BY table_name, privilege_type;

-- Should be NO for all three.
SELECT rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles WHERE rolname = 'snaptip';

-- Read-only should only have SELECT.
SELECT DISTINCT privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'snaptip_readonly';
```

If `rolsuper`, `rolcreatedb`, or `rolcreaterole` is `t` (true), revoke
immediately:

```sql
ALTER ROLE snaptip NOSUPERUSER NOCREATEDB NOCREATEROLE;
```

---

## 2. pgcrypto extension (required by Phase 4.2)

`account_details` for withdrawals contains IBAN/RIB/wallet identifiers. These
are encrypted at rest with `pgp_sym_encrypt` keyed off `DATA_ENCRYPTION_KEY`
in `server/.env`.

The extension is created once by a superuser:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

The application user does NOT need any extra privilege after that — the
extension's functions are callable by any role with `USAGE` on `public`.

### Generate the key

```bash
openssl rand -base64 48 | tr -d '\n'
```

Paste that into `server/.env`:

```
DATA_ENCRYPTION_KEY=<the random string>
```

If the key is absent, the application falls back to writing plaintext into the
legacy `account_details` column (so deploys never break), but logs a clear
warning. Set the key, restart, then run the legacy backfill (next section).

### Backfill existing plaintext rows

After `DATA_ENCRYPTION_KEY` is set in `.env` and PM2 has restarted:

```bash
node server/scripts/encrypt-legacy-withdrawals.js
```

The script encrypts every row whose `account_details_enc` is NULL into the
new column and nulls out the plaintext. It is safe to re-run — already
encrypted rows are skipped.

---

## 3. Backups

See `scripts/backup-db.sh` and `scripts/install-backup-cron.sh`. Briefly:

- Daily `pg_dump --no-owner --no-acl --format=custom`
- Encrypt the dump with `gpg --symmetric --cipher-algo AES256` using
  `BACKUP_GPG_PASSPHRASE` from `/etc/snaptip/backup.env`
- Retain 7 daily, 4 weekly, 12 monthly under `/var/backups/snaptip/`
- Cron runs at 03:15 server time

Run `sudo bash scripts/install-backup-cron.sh` once to wire up the cron entry,
the directory, and the systemd-style log rotation hook. Re-running the
installer is idempotent.

### Test restore (do this before you trust it)

```bash
gpg --decrypt /var/backups/snaptip/daily/snaptip-YYYY-MM-DD.dump.gpg \
  | pg_restore --clean --if-exists --no-owner --no-acl -d snaptip_restore_test
```

If you don't periodically practice the restore, you don't have backups —
you have hopes.

---

## 4. Audit log (Phase 4.4)

`audit_log` is created by `initDB()` automatically on next server start. The
application writes to it from:

- `routes/admin.js` — login success & failure, logout, user suspend / reactivate /
  delete / reset-password, withdrawal mark-paid / reject / note, business delete
- `routes/auth.js` — login success, change-password, forgot-password,
  reset-password
- `routes/withdrawals.js` — request submitted
- `routes/payments.js` — payment recorded (`payment.recorded`)

Inspect recent activity:

```sql
SELECT created_at, actor_type, actor_id, action, target_type, target_id, ip_address
FROM audit_log
ORDER BY created_at DESC
LIMIT 100;
```

Retention: not enforced at the DB level. Recommend a quarterly cron to
archive rows older than 12 months to cold storage.
