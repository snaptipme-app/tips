#!/usr/bin/env bash
# SnapTip VPS hardening. Run once on a fresh server, then re-run is idempotent.
#
#   sudo bash scripts/vps-harden.sh <new-sudo-user>
#
# What it does (in order, with safety checks):
#   1. Creates the unprivileged sudo user if it doesn't exist
#   2. Refuses to disable password SSH unless that user has an authorized_keys
#      file with at least one key. This is the dead-man-switch — it will not
#      lock you out.
#   3. Sets up UFW: allow new SSH port, 80, 443. Default deny incoming.
#   4. Hardens /etc/ssh/sshd_config (Port, PermitRootLogin, PasswordAuthentication,
#      PermitEmptyPasswords, ChallengeResponseAuthentication, X11Forwarding).
#   5. Installs and enables fail2ban with aggressive SSH + nginx jails.
#   6. Installs unattended-upgrades configured for security-only updates.
#
# After running, log out, log back in as the new user on the new SSH port, and
# verify before closing the original SSH session.

set -Eeuo pipefail

# ── Parse args ─────────────────────────────────────────────────────────────
NEW_USER="${1:-}"
NEW_SSH_PORT="${SSH_PORT:-2222}"

if [[ -z "$NEW_USER" ]]; then
  cat <<'USAGE' >&2
Usage: sudo bash scripts/vps-harden.sh <username> [SSH_PORT=2222]

Required: <username> is the non-root sudo user that will own SSH access.
Optional: set SSH_PORT env to override the default 2222.
  SSH_PORT=2244 sudo bash scripts/vps-harden.sh deploy
USAGE
  exit 2
fi
if [[ "$(id -u)" != "0" ]]; then
  echo "[harden] must run as root" >&2
  exit 1
fi
if ! [[ "$NEW_SSH_PORT" =~ ^[0-9]+$ ]] || (( NEW_SSH_PORT < 1024 || NEW_SSH_PORT > 65535 )); then
  echo "[harden] SSH_PORT must be a number between 1024 and 65535" >&2
  exit 2
fi

log() { printf '[harden] %s\n' "$*"; }

# ── 1. Sudo user ───────────────────────────────────────────────────────────
if id "$NEW_USER" &>/dev/null; then
  log "user $NEW_USER already exists"
else
  log "creating user $NEW_USER"
  adduser --disabled-password --gecos "" "$NEW_USER"
fi
usermod -aG sudo "$NEW_USER"

# Make sure the user can sudo without re-prompting them now (don't change
# their password — keys only).
USER_HOME="$(getent passwd "$NEW_USER" | cut -d: -f6)"
SSH_DIR="$USER_HOME/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"
mkdir -p "$SSH_DIR"
touch "$AUTH_KEYS"
chmod 700 "$SSH_DIR"
chmod 600 "$AUTH_KEYS"
chown -R "$NEW_USER:$NEW_USER" "$SSH_DIR"

if ! [[ -s "$AUTH_KEYS" ]]; then
  cat <<EOF >&2

[harden] $AUTH_KEYS is empty.

Add the operator's public key BEFORE disabling password auth:

  sudo -u $NEW_USER tee -a $AUTH_KEYS <<< 'ssh-ed25519 AAAA... operator@laptop'

Then re-run this script. Refusing to continue — disabling password auth now
would lock you out.
EOF
  exit 3
fi
log "verified $NEW_USER has at least one authorized_key"

# ── 2. UFW ─────────────────────────────────────────────────────────────────
log "configuring UFW"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ufw

# Ensure the existing session's SSH port is also allowed during the transition,
# otherwise enabling UFW on a server with sshd still listening on :22 would
# disconnect us mid-script.
CURRENT_SSH_PORT="$(awk '/^Port[[:space:]]+[0-9]+/ {print $2; exit}' /etc/ssh/sshd_config 2>/dev/null || echo 22)"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow "$NEW_SSH_PORT/tcp" comment 'SnapTip SSH'
[[ "$CURRENT_SSH_PORT" != "$NEW_SSH_PORT" ]] && ufw allow "$CURRENT_SSH_PORT/tcp" comment 'transitional SSH (remove after switch)'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# ── 3. SSH hardening ───────────────────────────────────────────────────────
log "hardening sshd_config (port=$NEW_SSH_PORT, key-only)"
SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%s)"

set_sshd_directive() {
  local key="$1" value="$2"
  if grep -qE "^[[:space:]]*#?[[:space:]]*${key}[[:space:]]" "$SSHD_CONFIG"; then
    sed -ri "s|^[[:space:]]*#?[[:space:]]*${key}[[:space:]].*|${key} ${value}|" "$SSHD_CONFIG"
  else
    printf '\n%s %s\n' "$key" "$value" >> "$SSHD_CONFIG"
  fi
}

set_sshd_directive Port                       "$NEW_SSH_PORT"
set_sshd_directive PermitRootLogin             no
set_sshd_directive PasswordAuthentication      no
set_sshd_directive PermitEmptyPasswords        no
set_sshd_directive ChallengeResponseAuthentication no
set_sshd_directive KbdInteractiveAuthentication    no
set_sshd_directive UsePAM                      yes
set_sshd_directive X11Forwarding               no
set_sshd_directive ClientAliveInterval         300
set_sshd_directive ClientAliveCountMax         2
set_sshd_directive MaxAuthTries                3
set_sshd_directive LoginGraceTime              30

if sshd -t; then
  systemctl restart ssh || systemctl restart sshd
  log "sshd restarted on port $NEW_SSH_PORT"
else
  log "ERROR: sshd_config validation failed — restoring backup"
  mv "${SSHD_CONFIG}.bak.$(ls -1t /etc/ssh/sshd_config.bak.* | head -1 | xargs -I{} basename {} | sed 's/sshd_config\.bak\.//')" "$SSHD_CONFIG"
  exit 4
fi

# ── 4. fail2ban ────────────────────────────────────────────────────────────
log "installing fail2ban"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
# Aggressive defaults: 1h ban after 4 strikes within 10 minutes.
bantime  = 3600
findtime = 600
maxretry = 4
backend  = systemd

[sshd]
enabled  = true
port     = $NEW_SSH_PORT
logpath  = %(sshd_log)s
maxretry = 3
bantime  = 86400

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log

[nginx-botsearch]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 2
bantime  = 86400
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban

# ── 5. Unattended-upgrades ─────────────────────────────────────────────────
log "configuring unattended-upgrades (security only)"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades apt-listchanges

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {};
Unattended-Upgrade::DevRelease "auto";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

systemctl enable --now unattended-upgrades

# ── 6. Summary ─────────────────────────────────────────────────────────────
cat <<EOF

──────────────────────────────────────────────────────────────────
[harden] DONE.

Next steps (do them BEFORE closing this shell):

  1. From a NEW terminal, verify SSH on the new port works:
       ssh -p $NEW_SSH_PORT $NEW_USER@<server-ip>
  2. Once verified, close the legacy port in UFW:
       sudo ufw delete allow $CURRENT_SSH_PORT/tcp
  3. Confirm fail2ban is active:
       sudo fail2ban-client status sshd
  4. Confirm unattended-upgrades scheduled:
       systemctl status apt-daily-upgrade.timer

If anything is wrong, you can still log in via the original session.
──────────────────────────────────────────────────────────────────
EOF
