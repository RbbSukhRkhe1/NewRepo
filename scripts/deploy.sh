#!/usr/bin/env bash
# Run on the Ubuntu server after each deploy (also invoked by GitHub Actions over SSH).
set -euo pipefail

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
cd "$APP_DIR"

docker_cmd() {
  if docker version >/dev/null 2>&1; then
    docker "$@"
    return 0
  fi
  sudo docker "$@"
}

if [[ ! -f docker-compose.yml ]]; then
  echo "docker-compose.yml not found in $APP_DIR" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    echo "==> Creating .env from .env.example (first deploy)…"
    cp .env.example .env
  else
    echo "Missing .env and .env.example — cannot continue." >&2
    exit 1
  fi
fi

ensure_session_secret() {
  if grep -q '^SESSION_SECRET=' .env 2>/dev/null; then
    # If user explicitly set it, keep it.
    local v
    v="$(grep -E '^SESSION_SECRET=' .env | head -n 1 | cut -d= -f2- | tr -d '\r')"
    if [[ -n "$v" ]] && [[ "$v" != "vaultex-local-docker-secret-replace-for-any-shared-deploy" ]]; then
      return 0
    fi
  fi

  local secret=""
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 32)"
  elif command -v python3 >/dev/null 2>&1; then
    secret="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  else
    # Last resort: still better than empty; user should replace.
    secret="$(date +%s%N)-$(hostname)"
  fi

  if grep -q '^SESSION_SECRET=' .env 2>/dev/null; then
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$secret/" .env
  else
    echo "SESSION_SECRET=$secret" >> .env
  fi
  echo "==> Set SESSION_SECRET in .env"
}

ensure_session_secret

echo "==> Pulling published images (redis, anvil, foundry)…"
docker_cmd compose pull redis anvil 2>/dev/null || docker_cmd compose pull

echo "==> Building and starting stack…"
docker_cmd compose up -d --build --remove-orphans

echo "==> Service status"
docker_cmd compose ps

echo "==> Pruning dangling images (optional cleanup)…"
docker_cmd image prune -f >/dev/null 2>&1 || true

PORT="$(grep -E '^WEB_HOST_PORT=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
PORT="${PORT:-8080}"
echo "Deploy finished. App: http://$(hostname -I | awk '{print $1}'):${PORT}"
