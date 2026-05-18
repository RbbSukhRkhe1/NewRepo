#!/usr/bin/env bash
# One-time lightweight setup: Node 20, nginx, systemd — no Docker.
# Usage: bash scripts/server-bootstrap-native.sh
set -euo pipefail

APP_DIR="${VAULTEX_HOME:-/opt/vaultex}"
WEB_ROOT="${VAULTEX_WEB_ROOT:-/var/www/vaultex}"
DATA_DIR="${VAULTEX_DATA_DIR:-/var/lib/vaultex}"
REPO_URL="${VAULTEX_REPO_URL:-https://github.com/RbbSukhRkhe1/NewRepo.git}"
BRANCH="${VAULTEX_BRANCH:-main}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as your normal user (ubuntu), not root — script uses sudo." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=wait-for-apt.sh
source "$SCRIPT_DIR/wait-for-apt.sh"
chmod +x "$SCRIPT_DIR/wait-for-apt.sh" 2>/dev/null || true

echo "==> Packages (git, nginx, build tools for better-sqlite3)…"
if ! command -v git >/dev/null 2>&1; then
  "$SCRIPT_DIR/wait-for-apt.sh" apt-get update -qq
  "$SCRIPT_DIR/wait-for-apt.sh" apt-get install -y git
fi
"$SCRIPT_DIR/wait-for-apt.sh" apt-get update -qq
"$SCRIPT_DIR/wait-for-apt.sh" apt-get install -y nginx rsync git curl ca-certificates build-essential python3

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Node.js 20…"
  wait_for_apt_lock
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  "$SCRIPT_DIR/wait-for-apt.sh" apt-get install -y nodejs
fi

echo "==> Clone or update repo at $APP_DIR…"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
  cd "$APP_DIR"
fi

chmod +x scripts/deploy-native.sh scripts/deploy.sh scripts/install-foundry.sh 2>/dev/null || true

echo "==> Foundry (Anvil)…"
bash scripts/install-foundry.sh

echo "==> Data directory for SQLite…"
sudo mkdir -p "$DATA_DIR"
sudo chown "$USER:$USER" "$DATA_DIR"

echo "==> API environment…"
sudo mkdir -p /etc/vaultex
if [[ ! -f /etc/vaultex/api.env ]]; then
  sudo cp deploy/vaultex-api.env.example /etc/vaultex/api.env
  SECRET=$(openssl rand -hex 32)
  sudo sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" /etc/vaultex/api.env
  echo "Created /etc/vaultex/api.env with random SESSION_SECRET."
else
  echo "Keeping existing /etc/vaultex/api.env"
fi

sudo chown root:"$USER" /etc/vaultex/api.env
sudo chmod 640 /etc/vaultex/api.env

echo "==> systemd units (Anvil + API)…"
bash "$SCRIPT_DIR/install-systemd-units.sh"
sudo systemctl enable vaultex-anvil

echo "==> UFW (optional)…"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || true
  sudo ufw allow 80/tcp comment 'Vaultex HTTP' || true
  sudo ufw allow 443/tcp comment 'Vaultex HTTPS' || true
  sudo ufw --force enable || true
fi

echo ""
echo "==> Stop Docker stack if it was running (frees RAM)…"
if [[ -f "$APP_DIR/docker-compose.yml" ]] && command -v docker >/dev/null 2>&1; then
  (cd "$APP_DIR" && docker compose down 2>/dev/null) || true
fi

echo ""
echo "Bootstrap complete."
echo "  1) OCI security list: allow TCP 80 (and 443 later)."
echo "  2) cd $APP_DIR && ./scripts/deploy-native.sh"
echo ""
echo "GitHub Actions: Deploy workflow runs after CI on push to main."
