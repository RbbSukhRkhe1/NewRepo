#!/usr/bin/env bash
# Wait for unattended-upgrades / other apt jobs, then run apt-get (or any command).
# Usage: ./scripts/wait-for-apt.sh apt-get install -y nginx
# Sourced by bootstrap for wait_for_apt_lock only — must not exit the parent script.

MAX_WAIT="${WAIT_FOR_APT_MAX:-900}"

wait_for_apt_lock() {
  local waited=0
  while true; do
    local blocked=false
    for lock in /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock; do
      if sudo fuser "$lock" >/dev/null 2>&1; then
        blocked=true
        break
      fi
    done
    if [[ "$blocked" == false ]]; then
      return 0
    fi
    if pgrep -f unattended-upgr >/dev/null 2>&1; then
      echo "==> Waiting for unattended-upgrades to release apt (${waited}s / ${MAX_WAIT}s)…"
    else
      echo "==> Waiting for apt/dpkg lock (${waited}s / ${MAX_WAIT}s)…"
    fi
    sleep 5
    waited=$((waited + 5))
    if [[ "$waited" -ge "$MAX_WAIT" ]]; then
      echo "Timed out waiting for apt. Try: ps aux | grep -E 'apt|dpkg|unattended'" >&2
      return 1
    fi
  done
}

# Only run CLI when executed directly — sourcing defines wait_for_apt_lock only.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
  if [[ $# -eq 0 ]]; then
    wait_for_apt_lock
    exit 0
  fi
  wait_for_apt_lock
  exec sudo DEBIAN_FRONTEND=noninteractive "$@"
fi
