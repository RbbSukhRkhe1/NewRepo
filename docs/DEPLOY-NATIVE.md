# Native deploy (nginx + Node + Anvil, no Docker)

**Last updated:** May 2026 · powers **https://vaultex.club** for capstone demos.

For **Oracle Always Free** (~1 GB RAM), a full **Docker Compose** stack is heavy. This path runs:

| Service | How | Typical RAM |
|---------|-----|-------------|
| **nginx** | apt package | ~10 MB |
| **Anvil** | Foundry binary + systemd | ~50–150 MB |
| **Node API** | systemd | ~80–200 MB |
| **Redis** | *off* (`REDIS_DISABLED=1`) | 0 |

**Donate / disburse / chain watcher** use local Anvil on `127.0.0.1:8545` (same as Docker setup, without containers).

---

## One-time setup

```bash
cd /opt/vaultex
git pull origin main
chmod +x scripts/server-bootstrap-native.sh scripts/install-foundry.sh scripts/deploy-native.sh
./scripts/server-bootstrap-native.sh
./scripts/deploy-native.sh
```

**Oracle Cloud ingress:** TCP **80** (and **443** for HTTPS later). Anvil stays on **localhost only** — do not expose **8545** publicly.

---

## Deploy / update

```bash
cd /opt/vaultex
git pull origin main
./scripts/deploy-native.sh
```

Site: **http://vaultex.club** (port 80). nginx serves **`/opt/vaultex/frontend/dist`**; `/api` proxies to the API (keep `/api` prefix — do not use `proxy_pass …3847/`).

---

## Sign in or register fails

### 1. nginx strips `/api` (most common)

If `location` uses **`proxy_pass http://127.0.0.1:3847/;`** (trailing slash), `/api/auth/login` becomes **`/auth/login`** on the backend and returns **404**. Login and register will not work.

Use **no** trailing slash on the upstream URL:

```nginx
location /api {
    proxy_pass http://127.0.0.1:3847;
    # ... headers ...
}
```

Then: `sudo nginx -t && sudo systemctl reload nginx`

Quick check from the server:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"x@y.z","password":"bad"}'
# Expect 401 (invalid credentials), not 404
```

### 2. Register needs Anvil

`POST /auth/register` funds a new account on-chain. If Anvil is down or RPC fails, registration returns **500**. Sign in with **seeded** users (e.g. `admin@vaultex.local` / `demo123`) only needs the database.

### 3. SQLite not writable

Ensure the API user can write `/var/lib/vaultex/`:

```bash
sudo chown -R ubuntu:ubuntu /var/lib/vaultex
```

### 4. HTTPS vs HTTP

Use **http://** for your domain until TLS is configured. **https://** without a certificate can break requests or cookies.

---

## GitHub Actions

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | Public IP |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | SSH private key |

Optional: `DEPLOY_PATH` = `/opt/vaultex`

---

## systemd services

```bash
sudo systemctl status vaultex-anvil vaultex-api nginx
sudo journalctl -u vaultex-anvil -f
sudo journalctl -u vaultex-api -f
```

**Health checks:**

```bash
curl -s -X POST http://127.0.0.1:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
curl -s http://127.0.0.1:3847/ready
```

---

## Config

| File | Purpose |
|------|---------|
| `/etc/vaultex/api.env` | API env (`ANVIL_RPC_URL`, `SESSION_SECRET`, …) |
| `/etc/systemd/system/vaultex-anvil.service` | Local chain |
| `/etc/systemd/system/vaultex-api.service` | Express API |
| `/etc/nginx/sites-enabled/vaultex` | SPA + `/api` proxy |

If you previously used **no-chain** mode, `deploy-native.sh` comments out `READY_SKIP_RPC=1` and adds Anvil URLs automatically.

---

## Upgrading from Docker on the same VM

```bash
cd /opt/vaultex
docker compose down
./scripts/server-bootstrap-native.sh   # if not done yet
./scripts/deploy-native.sh
```

---

## Optional: Redis

If you need pub/sub events:

```bash
sudo apt install redis-server
```

Edit `/etc/vaultex/api.env`: remove or set `REDIS_DISABLED=0`, add `REDIS_URL=redis://127.0.0.1:6379`, then `sudo systemctl restart vaultex-api`.

---

## HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vaultex.club -d www.vaultex.club
```

---

## Memory (rough)

| Stack | Idle RAM |
|-------|----------|
| Docker full compose | ~800 MB – 1.5 GB+ |
| nginx + Anvil + Node (this) | ~250–450 MB |

If the VM swaps heavily, use a **2 GB** shape or keep `REDIS_DISABLED=1`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Donate fails | `sudo systemctl status vaultex-anvil`; `curl` chainId above |
| `/ready` 503, rpc fail | Start anvil: `sudo systemctl restart vaultex-anvil` |
| `anvil: command not found` | `bash scripts/install-foundry.sh` |
| API starts before chain | API unit waits on `vaultex-anvil.service`; redeploy |
