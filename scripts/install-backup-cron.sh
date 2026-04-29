#!/usr/bin/env bash
# Idempotent installer for the SnapTip database backup job.
#
# Run once on the production host as root:
#   sudo bash /opt/snaptip/scripts/install-backup-cron.sh
#
# Re-runs are safe: the cron entry is replaced if it already exists, the env
# file is created only if missing, and the log file is touch'd not truncated.

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$REPO_ROOT/scripts/backup-db.sh"
BACKUP_ROOT="/var/backups/snaptip"
ENV_DIR="/etc/snaptip"
ENV_FILE="$ENV_DIR/backup.env"
LOG_FILE="/var/log/snaptip-backup.log"
LOGROTATE_FILE="/etc/logrotate.d/snaptip-backup"
CRON_FILE="/etc/cron.d/snaptip-backup"

if [[ "$(id -u)" != "0" ]]; then
  echo "[install] must run as root" >&2
  exit 1
fi
if [[ ! -x "$BACKUP_SCRIPT" ]]; then
  chmod +x "$BACKUP_SCRIPT"
fi

# ── Backup output directory ───────────────────────────────────────────────
mkdir -p "$BACKUP_ROOT"/{daily,weekly,monthly,.tmp}
chown -R root:root "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

# ── Env file (secrets) ────────────────────────────────────────────────────
mkdir -p "$ENV_DIR"
chmod 700 "$ENV_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
# SnapTip backup credentials. Owned by root, mode 600.
PGHOST=localhost
PGPORT=5432
PGUSER=snaptip
PGPASSWORD=replace-me
PGDATABASE=snaptip
# Generate with: openssl rand -base64 48 | tr -d '\n'
BACKUP_GPG_PASSPHRASE=replace-me
EOF
  chmod 600 "$ENV_FILE"
  echo "[install] wrote template $ENV_FILE — fill in the real values before next 03:15"
else
  chmod 600 "$ENV_FILE"
  echo "[install] $ENV_FILE already exists — leaving as-is"
fi

# ── Log file + rotation ───────────────────────────────────────────────────
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"
cat > "$LOGROTATE_FILE" <<EOF
$LOG_FILE {
  weekly
  rotate 8
  compress
  missingok
  notifempty
  copytruncate
}
EOF

# ── Cron ──────────────────────────────────────────────────────────────────
# 03:15 every day. Runs as root because pg_dump uses TCP + creds from $ENV_FILE
# and gpg + chmod on /var/backups need root regardless.
cat > "$CRON_FILE" <<EOF
# SnapTip database backup. Edit via $0 (regenerated on every run).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root $BACKUP_SCRIPT >> $LOG_FILE 2>&1
EOF
chmod 644 "$CRON_FILE"

echo "[install] cron entry installed at $CRON_FILE"
echo "[install] next run: 03:15. Smoke-test now with:"
echo "  sudo bash $BACKUP_SCRIPT"
