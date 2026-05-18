# Source from deploy scripts:  source "$(dirname "$0")/deploy-env.sh"
# Safe HOME/USER/PATH for non-interactive SSH (GitHub Actions).

if [[ -z "${USER:-}" ]]; then
  USER="$(whoami)"
  export USER
fi

if [[ -z "${HOME:-}" ]]; then
  HOME="$(getent passwd "$USER" 2>/dev/null | cut -d: -f6 || true)"
  if [[ -z "${HOME:-}" ]]; then
    HOME="/home/$USER"
  fi
  export HOME
fi

FOUNDRY_BIN="${HOME}/.foundry/bin"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${FOUNDRY_BIN}:${PATH:-}"
