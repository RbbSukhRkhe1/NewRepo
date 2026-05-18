# Source from deploy scripts:  source "$(dirname "$0")/deploy-env.sh"
# Safe HOME/USER/PATH for non-interactive SSH (GitHub Actions).

# When using sudo, keep the real login user (Foundry lives in their home).
if [[ -n "${SUDO_USER:-}" ]] && [[ "${SUDO_USER}" != "root" ]]; then
  USER="$SUDO_USER"
elif [[ -z "${USER:-}" ]] || [[ "$USER" == "root" ]]; then
  USER="$(whoami)"
  if [[ "$USER" == "root" ]]; then
    USER="ubuntu"
  fi
fi
export USER

HOME="$(getent passwd "$USER" 2>/dev/null | cut -d: -f6 || true)"
if [[ -z "${HOME:-}" ]]; then
  HOME="/home/$USER"
fi
export HOME

FOUNDRY_BIN="${HOME}/.foundry/bin"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${FOUNDRY_BIN}:${PATH:-}"
