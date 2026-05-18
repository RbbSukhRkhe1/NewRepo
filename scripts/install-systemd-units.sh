#!/usr/bin/env bash
# Write vaultex-anvil + vaultex-api units with correct user and binary paths.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-env.sh
source "$SCRIPT_DIR/deploy-env.sh"

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"
RUN_USER="${VAULTEX_RUN_USER:-$USER}"
ANVIL_BIN="${HOME}/.foundry/bin/anvil"
NPM_BIN="$(command -v npm)"

if [[ ! -x "$ANVIL_BIN" ]]; then
  echo "ERROR: anvil not found at $ANVIL_BIN — run scripts/install-foundry.sh" >&2
  exit 1
fi

if [[ -z "$NPM_BIN" ]]; then
  echo "ERROR: npm not in PATH" >&2
  exit 1
fi

echo "==> Installing systemd units (user=$RUN_USER, anvil=$ANVIL_BIN)"

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

sudo tee /etc/systemd/system/vaultex-api.service >/dev/null <<EOF
[Unit]
Description=Vaultex API (Node)
After=network-online.target vaultex-anvil.service
Wants=vaultex-anvil.service

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=/etc/vaultex/api.env
ExecStart=${NPM_BIN} run start -w backend
Restart=on-failure
RestartSec=5
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "  wrote vaultex-anvil.service and vaultex-api.service"
