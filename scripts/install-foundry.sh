#!/usr/bin/env bash
# Install Foundry (anvil, forge) for the current user — no Docker.
set -euo pipefail

export PATH="${HOME}/.foundry/bin:${PATH}"

if command -v anvil >/dev/null 2>&1 && command -v cast >/dev/null 2>&1; then
  echo "Foundry already installed: $(anvil --version | head -1)"
  exit 0
fi

echo "==> Installing Foundry via foundryup…"
curl -L https://foundry.paradigm.xyz | bash

# shellcheck disable=SC1091
[[ -f "${HOME}/.bashrc" ]] && source "${HOME}/.bashrc"
export PATH="${HOME}/.foundry/bin:${PATH}"

if [[ -x "${HOME}/.foundry/bin/foundryup" ]]; then
  "${HOME}/.foundry/bin/foundryup"
fi

if ! command -v anvil >/dev/null 2>&1; then
  echo "anvil not on PATH after install. Try: export PATH=\"\${HOME}/.foundry/bin:\$PATH\"" >&2
  exit 1
fi

echo "Installed: $(anvil --version | head -1)"
