# Vaultex — feature inventory (shipped vs roadmap)

Updated to match the monolith in `frontend/` + `backend/server/` (May 2026).

## Shipped — backend (Express, `/api`)

| Feature | Routes / behavior |
|---------|-------------------|
| Public config | `GET /config` — vault address + masked + **`network`** + **`chainId`** |
| Overview stats | `GET /overview` — cause aggregates, ledger sums, optional vault balance |
| Auth | `POST /auth/login`, `POST /auth/logout`, `POST /auth/register`, `GET /auth/me` |
| Users (admin) | `GET /users` |
| Causes | `GET /causes`, `GET /causes/:id`, `POST /causes` (admin), admin list/update/delete |
| Donate | `POST /donate` (signed-in donor) → chain tx + ledger + cause `raised_eth` |
| Disburse | `POST /causes/:id/disburse`, `POST /disburse` (admin) → chain tx + ledger + FIFO `linked_tx_ids` |
| Public ledger v1 | `GET /ledger` |
| **Ledger v2** | `GET /ledger/v2`, tags, detail, verify, search (FTS5) |
| **Donation lifecycle** | `GET /ledger/v2/lifecycle/:txHash` (auth, donor owns tx) |
| **Badges** | `GET /me/badges` (per-cause donor totals) |
| User history | `GET /me/history` |
| Balance | `GET /balance/:anvilIndex` (0–9) |
| Health | `GET /health` (root) |
| Readiness | `GET /ready` (root) — SQLite + optional RPC |
| Chain watcher | WebSocket ingest → `chain_sync` when Anvil up |
| Seeding | Demo users + marketing causes |
| Redis pub/sub | `donation.created` / `disbursement.created` (disable with `REDIS_DISABLED=1`) |
| WebSocket | **`/api/ws`** — Redis pub/sub + in-process events (no polling on ledger; see `server/constants.ts`) |

## Shipped — frontend (React Router)

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/login`, `/register` | Auth |
| `/causes`, `/causes/completed`, `/causes/:id` | Browse / completed / detail |
| `/causes/new`, `/admin/*` | Admin cause & user management |
| `/donate` | Donation flow |
| `/ledger` | Ledger v2 UI (search, modal, live WS at `/api/ws`) |
| `/account` | Wallet, history, badges, admin disburse |
| `/lifecycle/:txHash` | Donation lifecycle (auth) |

## Automated tests

| Layer | Command |
|-------|---------|
| Backend unit + API | `npm run test -w backend` |
| Frontend unit | `npm run test -w frontend` |
| Full regression | `npm run regression` (tests + tsc + frontend build) |
| Live API smoke | `node scripts/integration-smoke.mjs` (API must be running) |
| Foundry | `forge test` (repo root) |

CI runs lint, tests, frontend build, backend typecheck, and a **Docker Compose** build/smoke job (SPA, API, WebSocket) — see `.github/workflows/ci.yml`. Production deploy (`deploy.yml`) runs the same stack on the server via `scripts/deploy.sh`.

## Data model (SQLite)

`users`, `causes`, `ledger_entries` (+ v2 columns, FTS5), `schema_migrations` — see `backend/server/db.ts`.

## Smart contracts (Foundry)

`VaultexVault.sol` deployable; **API still uses Anvil EOA vault (index 0)**, not the contract.

## Not shipped (see `CAPSTONE_TASK_TRACKER.csv`)

PDF receipts, MetaMask/Sepolia user signing, microservices gateway, Playwright E2E, PDF export, email reports, NFT certs, `VAULTEX_VAULT_ADDRESS` API wiring, full public-address privacy audit, etc.

## Architecture

Target microservices: [ARCHITECTURE.md](./ARCHITECTURE.md), [ADR/](./ADR/), [openapi/](./openapi/) stubs.
