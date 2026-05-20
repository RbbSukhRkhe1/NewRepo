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
  echo "Missing .env — copy .env.example to .env and set SESSION_SECRET (see docs/DEPLOY.md)." >&2
  exit 1
fi

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
