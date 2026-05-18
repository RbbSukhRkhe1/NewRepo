#!/usr/bin/env bash
# Native deploy: nginx static + systemd Node API (no Docker).
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "==> Installing git…"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git
fi

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
WEB_ROOT="${VAULTEX_WEB_ROOT:-/var/www/vaultex}"
API_ENV="${VAULTEX_API_ENV:-/etc/vaultex/api.env}"

cd "$APP_DIR"

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
if [[ -f deploy/vaultex-anvil.service ]]; then
  sudo cp deploy/vaultex-anvil.service /etc/systemd/system/vaultex-anvil.service
fi

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

echo "==> Status"
sudo systemctl is-active vaultex-api
curl -sf http://127.0.0.1:3847/health >/dev/null && echo "API health: ok" || echo "API health: FAIL — check: sudo journalctl -u vaultex-api -n 40"
curl -sf http://127.0.0.1:3847/ready >/dev/null && echo "API ready (DB + RPC): ok" || echo "API ready: check RPC — sudo journalctl -u vaultex-anvil -n 20"
echo "Done. Open http://vaultex.club (port 80 — ensure OCI allows TCP 80)."
