#!/usr/bin/env bash
# One-time setup on Oracle Cloud Ubuntu (or similar). Run as a user with sudo.
# Usage: curl -fsSL ... | bash   OR   bash scripts/server-bootstrap.sh
set -euo pipefail

APP_DIR="${VAULTEX_HOME:-/opt/vaultex}"
REPO_URL="${VAULTEX_REPO_URL:-https://github.com/RbbSukhRkhe1/NewRepo.git}"
BRANCH="${VAULTEX_BRANCH:-main}"

echo "==> Installing Docker (if needed)…"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" |
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "Added $USER to group docker — log out and back in (or new SSH session) before running deploy."
fi

echo "==> Cloning or updating repository at $APP_DIR…"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo chown -R "$USER:$USER" "$(dirname "$APP_DIR")" 2>/dev/null || true
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
  cd "$APP_DIR"
fi

chmod +x scripts/deploy.sh

if [[ ! -f .env ]]; then
  cp .env.example .env
  SECRET=$(openssl rand -hex 32)
  if grep -q '^SESSION_SECRET=' .env 2>/dev/null; then
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" .env
  else
    echo "SESSION_SECRET=$SECRET" >> .env
  fi
  echo "Created .env with a random SESSION_SECRET."
fi

echo "==> UFW (optional firewall)…"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || true
  sudo ufw allow 8080/tcp comment 'Vaultex web' || true
  sudo ufw --force enable || true
fi

echo ""
echo "Bootstrap complete."
echo "  1) Add this server's SSH public key to GitHub Actions secrets (DEPLOY_SSH_KEY = matching private key)."
echo "  2) In Oracle Cloud: VCN → Security List → Ingress — allow TCP 22 and 8080 from your IP (or 0.0.0.0/0 for demos)."
echo "  3) Set GitHub secrets: DEPLOY_HOST, DEPLOY_USER=ubuntu, DEPLOY_PATH=$APP_DIR"
echo "  4) Push to main (CI passes) or run Deploy workflow manually."
echo ""
echo "First deploy: cd $APP_DIR && ./scripts/deploy.sh"
