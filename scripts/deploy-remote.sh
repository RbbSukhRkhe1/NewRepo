#!/usr/bin/env bash
# Entry point for GitHub Actions SSH deploy (and manual parity).
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${HOME}/.foundry/bin:${PATH:-}"

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
cd "$APP_DIR"

echo "==> Deploy remote · $(whoami)@$(hostname) · $(pwd)"
echo "==> git $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1 (PATH=$PATH)" >&2
    exit 1
  fi
  echo "  ok: $1 → $(command -v "$1")"
}

echo "==> Preflight"
require_cmd git
require_cmd node
require_cmd npm
require_cmd sudo

if [[ ! -f /etc/vaultex/api.env ]] || [[ ! -f /etc/systemd/system/vaultex-anvil.service ]]; then
  echo "==> Bootstrap (first-time native stack)…"
  bash ./scripts/server-bootstrap-native.sh
fi

echo "==> Native deploy…"
bash ./scripts/deploy-native.sh

echo "==> Deploy remote finished OK"
