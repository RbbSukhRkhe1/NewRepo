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
FRONTEND_DIST="${APP_DIR}/frontend/dist"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/default.conf}"
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
# After a prior deploy, dist/ is often owned by www-data for nginx; Vite must
# rimraf output before rebuild — reclaim ownership for the current user first.
if [[ -e "$FRONTEND_DIST" ]]; then
  echo "==> Reclaim $FRONTEND_DIST for build (fix www-data ownership from last deploy)…"
  sudo chown -R "$(id -u):$(id -g)" "$FRONTEND_DIST"
fi
npm ci --include=dev
npm run build

echo "==> Frontend build at $FRONTEND_DIST…"
if [[ ! -f "$FRONTEND_DIST/index.html" ]]; then
  echo "ERROR: missing $FRONTEND_DIST/index.html after npm run build" >&2
  exit 1
fi
sudo chown -R www-data:www-data "$FRONTEND_DIST"

echo "==> Install nginx ($NGINX_CONF)…"
sudo cp deploy/nginx-vaultex.conf "$NGINX_CONF"
sudo rm -f /etc/nginx/sites-enabled/vaultex 2>/dev/null || true
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

if ! wait_for_http "http://127.0.0.1/api/config" "GET /api/config (via nginx)"; then
  echo "Trying direct API health…" >&2
  wait_for_http "http://127.0.0.1:3847/health" "GET /health (direct)" || true
fi

if ! curl -sf http://127.0.0.1/api/config | grep -q '"chainId"'; then
  echo "GET /api/config via nginx: FAIL (check proxy_pass keeps /api prefix)" >&2
  sudo nginx -T 2>/dev/null | head -80 >&2 || true
  exit 1
fi
echo "GET /api/config via nginx: ok"

# Wrong nginx often uses proxy_pass ...3847/ which strips /api — login/register then 404.
login_code="$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nonexistent@vaultex.local","password":"wrong"}')"
if [[ "$login_code" == "404" ]]; then
  echo "POST /api/auth/login returned 404 — nginx is stripping /api. Use:" >&2
  echo "  location /api { proxy_pass http://127.0.0.1:3847; }   # no trailing slash on 3847" >&2
  exit 1
fi
if [[ "$login_code" != "401" ]] && [[ "$login_code" != "400" ]]; then
  echo "POST /api/auth/login unexpected HTTP $login_code (expected 401 invalid credentials)" >&2
  exit 1
fi
echo "POST /api/auth/login via nginx: ok (route reachable, got $login_code)"

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
