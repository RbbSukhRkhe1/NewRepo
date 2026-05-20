#!/usr/bin/env bash
# Entry point for GitHub Actions SSH deploy (and manual parity).
set -eo pipefail
export DEPLOY_PATH="${DEPLOY_PATH:-/opt/vaultex}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-env.sh
source "$SCRIPT_DIR/deploy-env.sh"

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
cd "$APP_DIR"

echo "==> Deploy remote · ${USER}@$(hostname) · HOME=${HOME} · $(pwd)"
echo "==> git $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "DEPLOY FAILED: required command not found: $1" >&2
    echo "PATH=${PATH}" >&2
    exit 1
  fi
  echo "  ok: $1 → $(command -v "$1")"
}

echo "==> Preflight"
require_cmd git
require_cmd sudo
require_cmd docker

if ! docker version >/dev/null 2>&1 && ! sudo docker version >/dev/null 2>&1; then
  echo "==> Bootstrap (first-time Docker stack)…"
  bash "$SCRIPT_DIR/server-bootstrap.sh"
fi

echo "==> Docker deploy…"
set -o pipefail
if ! bash "$SCRIPT_DIR/deploy.sh" 2>&1 | tee /tmp/vaultex-deploy.log; then
  echo "DEPLOY FAILED: deploy.sh (last 60 log lines):" >&2
  tail -60 /tmp/vaultex-deploy.log >&2 || true
  exit 1
fi

echo "==> Deploy remote finished OK"
