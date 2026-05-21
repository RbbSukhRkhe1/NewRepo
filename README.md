# Vaultex

**Vaultex** is a capstone-style web app for **transparent charitable giving**: donors fund causes, funds flow through a **Vaultex** routing account (modeled against a local Ethereum dev chain), and admins can **disburse** to beneficiary organizations. A **live ledger** combines in-app events with optional **chain sync** when Anvil is available.

The codebase name in `package.json` is `live-tx-ledger`; product name in the UI is **Vaultex**.

---

## What’s in the box

| Area | Stack |
|------|--------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router |
| **Backend** | Express 5, `better-sqlite3`, cookie sessions, bcrypt, ethers v6, **ioredis** (optional pub/sub) |
| **Chain (local dev)** | [Anvil](https://book.getfoundry.sh/reference/anvil/) — JSON-RPC + WebSocket for the block watcher |
| **Contracts** | Foundry at **repo root** (`foundry.toml`) — sources in `blockchain/src/`, libs in `blockchain/lib/` |

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: causes, donate flow, ledger, account, admin |
| `backend/server/` | REST API, SQLite schema, seeding, chain watcher |
| `blockchain/` | Solidity contracts (`src/`), deploy scripts (`script/`), tests (`test/`), vendored **`lib/`** (forge-std, OpenZeppelin) |
| `foundry.toml` | Foundry project config (paths point into `blockchain/`) |
| `frontend/Dockerfile`, `frontend/nginx.docker.conf` | Production SPA image (Vite build + nginx `/api` proxy) |
| `backend/Dockerfile` | Production API image (workspace install, `tsx` runtime) |
| `.env.example` | Template for Compose-time variables (copy to `.env` at repo root) |
| `docker-compose.yml` | Full stack: frontend, backend, Redis, Anvil (healthchecks + volumes) |

**Build outputs** (`blockchain/out/`, `blockchain/cache/`) and **deployment receipts** (`broadcast/` at repo root after `forge script --broadcast`) are **gitignored** — run `forge build` / deploy locally to regenerate.

### Smart contracts (Foundry)

[Install Foundry](https://book.getfoundry.sh/getting-started/installation) so `forge` and `anvil` are on your `PATH`.

From the **repository root**:

```bash
forge build          # compile blockchain/src + script + test
forge test           # run Solidity tests
```

**Deploy `VaultexVault` to local Anvil** (start `anvil` in another terminal first):

```bash
forge script blockchain/script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

By default the script uses **Anvil account #0**’s well-known dev private key (override with `PRIVATE_KEY` in the environment). The console prints **`VaultexVault: 0x…`** and **`Owner: 0x…`**.

**Contract address → backend env (optional, future wiring):**

1. Copy the **`VaultexVault:`** line from the terminal, **or** open  
   `broadcast/Deploy.s.sol/<chainId>/run-latest.json`  
   (created at the **repository root** next to `foundry.toml` after `--broadcast`; gitignored until you deploy).
2. Add to `backend/.env` (see `backend/.env.example`):

   `VAULTEX_VAULT_ADDRESS=0xYourDeployedAddress`

The current app still routes donations to the **Anvil EOA vault** (`SUPER_RICH_INDEX` in `backend/server/anvil.ts`); linking the API to this contract would be a separate integration task.

---

## Main user flows

1. **Register / log in** — roles: `admin`, `donor`, `beneficiary`.
2. **Causes** — browse `/causes`, open a cause, donate (donor).
3. **Donation page** — `/donate` for the giving experience.
4. **Ledger** — `/ledger` public activity (addresses masked where the API provides masked fields).
5. **Account** — `/account` balances and history (ties to Anvil indices when seeded).
6. **Admin** — `/admin/users`, create causes (`/admin/causes/new` or `/causes/new` with auth).

API routes are mounted under **`/api`** (see `backend/server/app.ts`).

---

## Prerequisites

- **Node.js** 20+ and **npm**
- **Foundry** (`forge`, `cast`, optional `anvil`) — [installation](https://book.getfoundry.sh/getting-started/installation)
- **Optional:** run **`anvil`** on `http://127.0.0.1:8545` for chain-linked features and the watcher (without it the API still runs; the watcher may skip or log connection issues).

---

## Install

From the **repository root**:

```bash
npm install
```

Uses **npm workspaces** (`frontend`, `backend`).

## Tests & regression

```bash
npm run test          # backend + frontend unit/API tests
npm run regression    # tests + backend tsc + frontend production build
node scripts/integration-smoke.mjs   # live API (start backend first)
forge test            # Solidity (repo root)
```

---

## Run (development)

**API + Vite together** (recommended):

```bash
npm run dev
```

- **Frontend:** Vite prints a URL (typically **http://localhost:5173**).
- **Backend:** **http://127.0.0.1:3847** — Vite proxies **`/api`** to this port (`frontend/vite.config.ts`).

| Command | Purpose |
|---------|---------|
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | Backend only |

---

## Docker (full stack)

The root **`docker-compose.yml`** runs the **full stack** with health checks and persistent **dev** volumes:

| Service | Image / build | Role |
|---------|----------------|------|
| **frontend** | `frontend/Dockerfile` (Vite build + **nginx**) | SPA on port **8080** (default); proxies **`/api`** to the backend (same-origin cookies). |
| **backend** | `backend/Dockerfile` (Node 20 monolith) | Express API on **3847**; SQLite on a named volume; Redis and Anvil via Compose service DNS. |
| **redis** | `redis:7-alpine` | AOF persistence on volume **`vaultex_redis_data`**. |
| **anvil** | `ghcr.io/foundry-rs/foundry:latest` | `anvil --host 0.0.0.0` on **8545** (published for `cast` / tooling). |

**One command** (from the **repository root**):

```bash
docker compose up --build
```

Detached (background): `docker compose up -d --build` (put **`-d`** after **`up`**, not `docker compose -d up`).

Open **http://localhost:8080** (change the host port with **`WEB_HOST_PORT`** in a root **`.env`**).

**Environment:** copy **`.env.example`** → **`.env`** next to `docker-compose.yml`. Compose reads it for `${VAR}` substitution. Set a strong **`SESSION_SECRET`** for anything beyond a throwaway local VM.

| Variable (root `.env`) | Default in compose | Purpose |
|------------------------|-------------------|---------|
| `WEB_HOST_PORT` | `8080` | Published nginx port |
| `API_HOST_PORT` | `3847` | Published API (debugging) |
| `ANVIL_HOST_PORT` | `8545` | Published JSON-RPC |
| `SESSION_SECRET` | dev-only default in compose | **Override** on shared hosts |
| `REDIS_URL` | `redis://redis:6379` | In-cluster broker |
| `REDIS_DISABLED` | empty | `1` skips pub/sub |
| `ANVIL_RPC_URL` / `ANVIL_WS_URL` | `http://anvil:8545` / `ws://anvil:8545` | Used when **`NETWORK=anvil`** |
| `NETWORK` | `anvil` | Set **`sepolia`** to point RPC at Sepolia vars below (compose still starts Anvil for optional tooling) |
| `SEPOLIA_RPC_URL` / `SEPOLIA_WS_URL` | empty | When **`NETWORK=sepolia`**, set reliable endpoints |
| `READY_SKIP_RPC` | empty | Set to `1` so **`GET /ready`** skips RPC (API-only / CI) |

**Volumes:** **`vaultex_sqlite_data`** holds **`/data/sqlite/donate.db`**; **`vaultex_redis_data`** holds Redis AOF. Remove with `docker compose down -v`.

**Future extraction (gateway, auth, …):** commented stubs are at the bottom of **`docker-compose.yml`**; see **[docs/ADR/0001-microservices-strangler-fig.md](docs/ADR/0001-microservices-strangler-fig.md)**. After a gateway exists, point nginx **`proxy_pass`** at it instead of the monolith.

### Docker troubleshooting

| Symptom | What to try |
|---------|-------------|
| **Backend logs `RPC not reachable` for `http://anvil:8545`** | The Foundry image uses a `sh -c` entrypoint; compose overrides **`entrypoint`** so Anvil binds **`0.0.0.0`**. Recreate: `docker compose up --build` (or `docker compose down` then `up`). |
| **Services stuck “starting”** | `docker compose ps` and `docker compose logs <service>` — first pull of the Foundry image can take several minutes. |
| **Backend unhealthy** | Confirm **redis** and **anvil** are healthy first. The API **`healthcheck`** calls **`GET /ready`** (SQLite + RPC); read **`docker compose logs backend`**. For API-only demos set **`READY_SKIP_RPC=1`** in root `.env`. |
| **`better-sqlite3` native errors** | Build with the repo **`backend/Dockerfile`** (deps stage installs compilers). |
| **Login or `/api` errors in the browser** | Use **http://localhost:8080** (nginx), not only port 3847, so paths and session cookies stay same-origin. |
| **Redis pub/sub off** | Set **`REDIS_DISABLED=1`** in root `.env` (or `backend/.env` when running the API outside Docker). Event schema: **[docs/REDIS_EVENTS.md](docs/REDIS_EVENTS.md)**. |
| **Wipe data** | `docker compose down -v` |

**API on the host + Redis in Docker:** `docker run -d --name vaultex-redis -p 6379:6379 redis:7-alpine redis-server --save '' --appendonly no` then set **`REDIS_URL=redis://127.0.0.1:6379`** in **`backend/.env`**.

---

## Demo / seeded accounts

On first run with an **empty** database, the API seeds demo users and causes. **Every seeded account uses the same password:**

**Password:** `demo123`

| Role | Email |
|------|--------|
| Admin | `admin@vaultex.local` |
| Donor | `haha@vaultex.local`, `sukhan@vaultex.local`, `tasin@vaultex.local` |
| Beneficiary | `citygeneral@hospital.local`, `childrens@hospital.local`, `regional@hospital.local` |

If the database already exists, seed users are **not** re-inserted. Delete `backend/server/data/*.db` (with the server stopped) to force a fresh seed, or register new users via `/register`.

---

## Environment variables (backend)

Create **`backend/.env`** if you need overrides (loaded via `dotenv` from `backend/server`). Copy **`backend/.env.example`** to `backend/.env` and edit values there (never commit real secrets).

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | API listen port | `3847` |
| `SQLITE_PATH` | SQLite file | `backend/server/data/donate.db` (under `server/data/`) |
| `NETWORK` | Logical chain: **`anvil`** (default) or **`sepolia`** — selects RPC defaults in `server/config.ts` | `anvil` |
| `ANVIL_RPC_URL` | HTTP JSON-RPC when **`NETWORK=anvil`** | `http://127.0.0.1:8545` |
| `ANVIL_WS_URL` | WebSocket for watcher when **`NETWORK=anvil`** | Derived from `ANVIL_RPC_URL` (`http` → `ws`) |
| `SEPOLIA_RPC_URL` | HTTP JSON-RPC when **`NETWORK=sepolia`** | Public Sepolia RPC fallback in code (rate-limited) if unset |
| `SEPOLIA_WS_URL` | WebSocket when **`NETWORK=sepolia`** | Derived from HTTP URL if unset (`https` → `wss`) |
| `REDIS_URL` | Redis for pub/sub events | `redis://localhost:6379` |
| `REDIS_EVENTS_CHANNEL` | Channel name for `publishEvent` | `vaultex:events` |
| `REDIS_DISABLED` | Skip Redis (no-op publish) | unset |
| `READY_SKIP_RPC` | If `1` or `true`, `GET /ready` skips the JSON-RPC ping (`rpc: "skipped"`) | unset |
| `SESSION_SECRET` | Session cookie signing | dev fallback in code (set in production) |

### Target network (`NETWORK`)

- **`NETWORK=anvil`** (default): **`ANVIL_RPC_URL`** / **`ANVIL_WS_URL`** drive the JSON-RPC provider, block watcher, and **`GET /ready`** RPC probe. Matches local **Anvil** / Foundry demos.
- **`NETWORK=sepolia`**: use **`SEPOLIA_RPC_URL`** (and optional **`SEPOLIA_WS_URL`**) for read/watch paths. Implementation lives in **`backend/server/config.ts`** (also re-exported from **`anvil.ts`** for convenience).

**Donate / demo safety:** **`POST /donate`** and **`POST /disburse`** still **sign on the server** with the well-known dev **HD mnemonic** in **`anvil.ts`**. That flow is **Anvil-first** for capstone safety (deterministic funded accounts). Switching **`NETWORK`** alone does **not** turn on browser **MetaMask** signing — that is a **separate frontend** track (see **`CAPSTONE_TASK_TRACKER.csv`** **F-010**). For Sepolia experiments you must fund the derived signer addresses or expect chain transactions to fail.

**`GET /api/config`** includes **`network`** and **`chainId`** (`31337` for Anvil, `11155111` for Sepolia) for future UI wiring.

### Root health endpoints (not under `/api`)

| Route | HTTP | Purpose |
|-------|------|--------|
| **`GET /health`** | 200 | **Liveness** — process is up (no DB or chain checks). Use for the cheapest probe. |
| **`GET /ready`** | 200 or 503 | **Readiness** — `PRAGMA quick_check` on SQLite; optional **`eth_chainId`** POST to the **configured HTTP RPC** (Anvil or Sepolia per **`NETWORK`**; 1.5s timeout). Response: `{ status, db, rpc, timestamp }`. **Docker Compose** uses **`/ready`** for the backend **`healthcheck`**. Tune **`start_period`** / **`retries`** or **`READY_SKIP_RPC`** as documented above. |


## Documentation

| Doc | Description |
|-----|---------------|
| [docs/README.md](docs/README.md) | Index of all docs |
| [blockchain/README.md](blockchain/README.md) | Solidity / Foundry layout inside `blockchain/` |
| [docs/FEATURES.md](docs/FEATURES.md) | Shipped features vs backlog (audit) |
| [docs/DEMO.md](docs/DEMO.md) | ~7 min demo script + slide outline |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Masking, roles, data handling |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Context + Mermaid sequences |
| [docs/COMPARATIVE.md](docs/COMPARATIVE.md) | Positioning vs other approaches |
| [docs/USER_TESTING.md](docs/USER_TESTING.md) | Usability session template + results table |
| [docs/ANVIL_STATE.md](docs/ANVIL_STATE.md) | Saving / restoring local Anvil state |
| [docs/REDIS_EVENTS.md](docs/REDIS_EVENTS.md) | Redis pub/sub envelope schema and dev commands |

---

## Other npm scripts (root)

| Script | What it does |
|--------|----------------|
| `npm run build` | Production build → `frontend/dist` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint in `frontend/` |

---

## Capstone planning

Team task breakdown lives in **`CAPSTONE_TASK_TRACKER.csv`** (open in Excel). Each row includes **Description** (short outcome), **Detailed_Prompt** (handoff for implementers or AI), story points, and assignee.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **`better-sqlite3` fails to install** | Use Node 20 LTS; on Windows install **Desktop development with C++** build tools if prebuilds miss. |
| **Browser `/api` errors** | Confirm backend is on **3847** or change `PORT` and Vite `proxy.target` together. |
| **`forge` / `forge build` not found** | Install [Foundry](https://book.getfoundry.sh/getting-started/installation) and ensure `forge` is on your `PATH`, then run commands from the **repo root**. |
| **Chain watcher warnings** | Check **`NETWORK`** and RPC env vars (`ANVIL_*` vs `SEPOLIA_*`); ensure the HTTP endpoint is up. The HTTP API can still work for many flows. |
| **Docker stack** | See **Docker troubleshooting** under [Docker (full stack)](#docker-full-stack). |

---

## License / course use

Private capstone repository — use and attribution per your course policy.
