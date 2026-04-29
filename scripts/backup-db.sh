#!/usr/bin/env bash
# Daily PostgreSQL backup for SnapTip.
#
# - pg_dump in custom format (compressed, parallel-restorable)
# - GPG symmetric AES-256 with the passphrase from /etc/snaptip/backup.env
# - Retention: 7 daily, 4 weekly, 12 monthly under /var/backups/snaptip/
#
# Cron entry installed by scripts/install-backup-cron.sh:
#   15 3 * * * /opt/snaptip/scripts/backup-db.sh >> /var/log/snaptip-backup.log 2>&1
#
# Restore:
#   gpg --decrypt /var/backups/snaptip/daily/snaptip-YYYY-MM-DD.dump.gpg \
#     | pg_restore --clean --if-exists --no-owner --no-acl -d <db>

set -Eeuo pipefail

# ── Config ─────────────────────────────────────────────────────────────────
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/snaptip}"
ENV_FILE="${BACKUP_ENV_FILE:-/etc/snaptip/backup.env}"
RETAIN_DAILY=7
RETAIN_WEEKLY=4
RETAIN_MONTHLY=12

# ── Load secrets ───────────────────────────────────────────────────────────
# Expected variables in $ENV_FILE (chmod 600, root:root):
#   PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD
#   BACKUP_GPG_PASSPHRASE
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup] missing $ENV_FILE — aborting" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${PGDATABASE:?PGDATABASE is required in $ENV_FILE}"
: "${PGUSER:?PGUSER is required in $ENV_FILE}"
: "${BACKUP_GPG_PASSPHRASE:?BACKUP_GPG_PASSPHRASE is required in $ENV_FILE}"

DAY="$(date +%Y-%m-%d)"
DOW="$(date +%u)"           # 1..7, Mon=1
DOM="$(date +%d)"           # 01..31
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
MONTHLY_DIR="$BACKUP_ROOT/monthly"
TMP_DIR="$BACKUP_ROOT/.tmp"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR" "$TMP_DIR"
chmod 700 "$BACKUP_ROOT"

DUMP_PATH="$TMP_DIR/snaptip-$DAY.dump"
ENC_PATH="$TMP_DIR/snaptip-$DAY.dump.gpg"

trap 'rm -f "$DUMP_PATH" "$ENC_PATH"' EXIT

# ── Dump ───────────────────────────────────────────────────────────────────
echo "[backup] $(date -Iseconds) starting dump for $PGDATABASE"
pg_dump --format=custom --no-owner --no-acl --compress=6 \
  --file="$DUMP_PATH" "$PGDATABASE"

# ── Encrypt ────────────────────────────────────────────────────────────────
# --batch + --passphrase-fd 0 keeps the secret out of the process arg list.
printf '%s' "$BACKUP_GPG_PASSPHRASE" | \
  gpg --batch --yes --quiet --no-tty \
      --passphrase-fd 0 --pinentry-mode loopback \
      --symmetric --cipher-algo AES256 --compress-algo none \
      --output "$ENC_PATH" "$DUMP_PATH"

# ── Place into rotation slots ──────────────────────────────────────────────
cp -f "$ENC_PATH" "$DAILY_DIR/snaptip-$DAY.dump.gpg"
[[ "$DOW" == "7" ]] && cp -f "$ENC_PATH" "$WEEKLY_DIR/snaptip-$DAY.dump.gpg"     # Sunday
[[ "$DOM" == "01" ]] && cp -f "$ENC_PATH" "$MONTHLY_DIR/snaptip-$DAY.dump.gpg"   # 1st of month

# ── Retention ──────────────────────────────────────────────────────────────
prune() {
  local dir="$1" keep="$2"
  # Sorted oldest-first; delete everything past the newest $keep entries.
  ls -1t "$dir"/snaptip-*.dump.gpg 2>/dev/null | tail -n "+$((keep + 1))" | xargs -r rm -f
}
prune "$DAILY_DIR"   "$RETAIN_DAILY"
prune "$WEEKLY_DIR"  "$RETAIN_WEEKLY"
prune "$MONTHLY_DIR" "$RETAIN_MONTHLY"

echo "[backup] $(date -Iseconds) success — $(ls -lh "$DAILY_DIR/snaptip-$DAY.dump.gpg" | awk '{print $5}')"
