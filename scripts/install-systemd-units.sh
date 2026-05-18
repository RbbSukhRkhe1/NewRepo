#!/usr/bin/env bash
# Write vaultex-anvil + vaultex-api units with correct user and binary paths.
# Always uses the app user (ubuntu), not root — Foundry installs under /home/ubuntu.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_DIR="${VAULTEX_HOME:-${DEPLOY_PATH:-/opt/vaultex}}"

# sudo resets $USER/$HOME to root; use the user who invoked sudo.
RUN_USER="${VAULTEX_RUN_USER:-${SUDO_USER:-$USER}}"
if [[ "$RUN_USER" == "root" ]] || [[ -z "$RUN_USER" ]]; then
  RUN_USER="ubuntu"
fi

RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
ANVIL_BIN="${RUN_HOME}/.foundry/bin/anvil"
NPM_BIN="$(sudo -u "$RUN_USER" -H bash -lc 'command -v npm')"

if [[ ! -x "$ANVIL_BIN" ]]; then
  echo "ERROR: anvil not found at $ANVIL_BIN" >&2
  echo "Install as $RUN_USER: sudo -u $RUN_USER bash $SCRIPT_DIR/install-foundry.sh" >&2
  exit 1
fi

if [[ -z "$NPM_BIN" ]] || [[ ! -x "$NPM_BIN" ]]; then
  echo "ERROR: npm not found for user $RUN_USER" >&2
  exit 1
fi

echo "==> Installing systemd units"
echo "    user=$RUN_USER home=$RUN_HOME"
echo "    anvil=$ANVIL_BIN"
echo "    npm=$NPM_BIN"
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
