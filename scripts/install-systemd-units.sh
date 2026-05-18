#!/usr/bin/env bash
# Write vaultex-anvil + vaultex-api units with correct user and binary paths.
# Always uses the app user (ubuntu), not root — Foundry installs under /home/ubuntu.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
BACKEND_DIR="${APP_DIR}/backend"

RUN_USER="${VAULTEX_RUN_USER:-${SUDO_USER:-$USER}}"
if [[ "$RUN_USER" == "root" ]] || [[ -z "$RUN_USER" ]]; then
  RUN_USER="ubuntu"
fi

RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
ANVIL_BIN="${RUN_HOME}/.foundry/bin/anvil"
NODE_BIN="$(sudo -u "$RUN_USER" -H bash -lc 'command -v node')"

# tsx is hoisted to the workspace root in npm workspaces
TSX_IMPORT="${APP_DIR}/node_modules/tsx"
if [[ ! -d "$TSX_IMPORT" ]]; then
  TSX_IMPORT="${BACKEND_DIR}/node_modules/tsx"
fi
if [[ ! -d "$TSX_IMPORT" ]]; then
  echo "ERROR: tsx not found under ${APP_DIR}/node_modules — run: npm ci --include=dev" >&2
  exit 1
fi

if [[ ! -x "$ANVIL_BIN" ]]; then
  echo "ERROR: anvil not found at $ANVIL_BIN" >&2
  exit 1
fi

if [[ -z "$NODE_BIN" ]] || [[ ! -x "$NODE_BIN" ]]; then
  echo "ERROR: node not found for user $RUN_USER" >&2
  exit 1
fi

echo "==> Installing systemd units"
echo "    user=$RUN_USER home=$RUN_HOME"
echo "    anvil=$ANVIL_BIN"
echo "    node=$NODE_BIN"
echo "    backend cwd=$BACKEND_DIR"
echo "    app=$APP_DIR"

sudo tee /etc/systemd/system/vaultex-anvil.service >/dev/null <<EOF
[Unit]
Description=Vaultex local chain (Anvil / Foundry)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
ExecStart=${ANVIL_BIN} --host 127.0.0.1 --port 8545
Restart=on-failure
RestartSec=3
MemoryMax=384M

[Install]
WantedBy=multi-user.target
EOF

# Run from backend/ so server/index.ts resolves; env from /etc/vaultex/api.env (PORT=3847).
sudo tee /etc/systemd/system/vaultex-api.service >/dev/null <<EOF
[Unit]
Description=Vaultex API (Node)
After=network-online.target vaultex-anvil.service
Wants=vaultex-anvil.service

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=/etc/vaultex/api.env
ExecStart=${NODE_BIN} --import tsx ./server/index.ts
Restart=on-failure
RestartSec=5
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "  wrote vaultex-anvil.service and vaultex-api.service"
