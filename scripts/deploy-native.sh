#!/usr/bin/env bash
# Native deploy: nginx static + systemd Node API (no Docker).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-env.sh
source "$SCRIPT_DIR/deploy-env.sh"

if ! command -v git >/dev/null 2>&1; then
  echo "==> Installing git…"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git
fi

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
WEB_ROOT="${VAULTEX_WEB_ROOT:-/var/www/vaultex}"
API_ENV="${VAULTEX_API_ENV:-/etc/vaultex/api.env}"

cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: node/npm not in PATH. Install Node 20 or run server-bootstrap-native.sh." >&2
  echo "PATH=$PATH" >&2
  exit 1
fi

if [[ ! -f "$API_ENV" ]]; then
  echo "Missing $API_ENV — run scripts/server-bootstrap-native.sh first." >&2
  exit 1
fi

echo "==> Install dependencies & build frontend…"
# Install devDependencies too (tsc, vite for build; tsx for API runtime).
npm ci --include=dev
npm run build

echo "==> Publish SPA to $WEB_ROOT…"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete frontend/dist/ "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

echo "==> Install nginx site…"
sudo cp deploy/nginx-vaultex.conf /etc/nginx/sites-available/vaultex
sudo ln -sf /etc/nginx/sites-available/vaultex /etc/nginx/sites-enabled/vaultex
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

echo "==> Ensure Foundry / Anvil…"
if [[ -x scripts/install-foundry.sh ]]; then
  bash scripts/install-foundry.sh
fi
bash "$SCRIPT_DIR/install-systemd-units.sh"

echo "==> Enable Anvil RPC in API env (if upgrading from no-chain mode)…"
if [[ -f /etc/vaultex/api.env ]] && grep -q '^READY_SKIP_RPC=1' /etc/vaultex/api.env; then
  sudo sed -i 's/^READY_SKIP_RPC=1/# READY_SKIP_RPC=1 (Anvil enabled)/' /etc/vaultex/api.env
fi
if [[ -f /etc/vaultex/api.env ]] && ! grep -q '^ANVIL_RPC_URL=' /etc/vaultex/api.env; then
  echo 'ANVIL_RPC_URL=http://127.0.0.1:8545' | sudo tee -a /etc/vaultex/api.env >/dev/null
  echo 'ANVIL_WS_URL=ws://127.0.0.1:8545' | sudo tee -a /etc/vaultex/api.env >/dev/null
fi

echo "==> Start Anvil, wait for RPC…"
sudo systemctl daemon-reload
sudo systemctl enable vaultex-anvil
sudo systemctl restart vaultex-anvil
ready=false
for _ in $(seq 1 45); do
  if curl -sf -X POST http://127.0.0.1:8545 \
    -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo "Anvil did not become ready — check: sudo journalctl -u vaultex-anvil -n 50" >&2
  exit 1
fi
echo "Anvil RPC ok"

echo "==> Restart API & reload nginx…"
sudo systemctl enable vaultex-api
sudo systemctl restart vaultex-api
sudo systemctl reload nginx

wait_for_http() {
  local url="$1"
  local label="$2"
  local max="${3:-90}"
  local i
  for ((i = 1; i <= max; i++)); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "$label: ok (after ${i}s)"
      return 0
    fi
    sleep 1
  done
  echo "$label: FAIL after ${max}s" >&2
  return 1
}

echo "==> Status"
if sudo systemctl is-active --quiet vaultex-anvil; then
  echo "vaultex-anvil: active"
else
  echo "vaultex-anvil: FAILED" >&2
  sudo journalctl -u vaultex-anvil -n 40 --no-pager >&2 || true
  exit 1
fi

if sudo systemctl is-active --quiet vaultex-api; then
  echo "vaultex-api: active"
else
  echo "vaultex-api: FAILED" >&2
  sudo journalctl -u vaultex-api -n 40 --no-pager >&2 || true
  exit 1
fi

if ! wait_for_http "http://127.0.0.1:3847/health" "GET /health"; then
  sudo ss -tlnp | grep 3847 >&2 || true
  sudo journalctl -u vaultex-api -n 50 --no-pager >&2 || true
  exit 1
fi

ready_body=""
for _ in $(seq 1 30); do
  ready_body="$(curl -sf http://127.0.0.1:3847/ready 2>/dev/null || true)"
  if echo "$ready_body" | grep -q '"status":"ok"'; then
    echo "GET /ready: ok — $ready_body"
    break
  fi
  sleep 1
done
if ! echo "$ready_body" | grep -q '"status":"ok"'; then
  echo "GET /ready: ${ready_body:-<no response>}" >&2
  sudo journalctl -u vaultex-api -n 30 --no-pager >&2 || true
  exit 1
fi

echo "Done. Open http://vaultex.club (port 80 — ensure OCI allows TCP 80)."
