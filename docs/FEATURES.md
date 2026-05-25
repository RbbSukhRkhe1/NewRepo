# Vaultex — feature inventory (shipped vs roadmap)

**Last updated:** May 2026 · `main` branch.

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
| **WebSocket** | **`GET /api/ws`** — live ledger refresh (replaces UI polling on ledger/account/lifecycle) |

## Shipped — frontend (React Router)

| Route | Purpose |
|-------|---------|
| `/` | **Home:** hero (“Donate on-chain. Help for real.”), CTAs, **beneficiary story carousel** (4 slides, auto-advance, pause on hover), **How it works** (trust list + 3 steps + trust strip), **Join the Vault** |
| `/login`, `/register` | Auth (register linked from Join CTA; **Register not in top nav**) |
| `/causes` | Active campaigns |
| `/causes/completed` | **Impact** — fulfilled campaigns grid |
| `/causes/:id` | Cause detail, donate entry |
| `/causes/new`, `/admin/*` | Admin cause & user management |
| `/donate` | Donation flow |
| `/ledger` | Ledger v2 UI (search, modal, **live WS** at `/api/ws`) |
| `/account` | Wallet, history, badges, admin disburse |
| `/lifecycle/:txHash` | Donation lifecycle (auth) |

**Nav (logged out):** Home · Causes · **Impact** · Ledger · Sign in

## Dev / ops scripts (root)

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + Vite |
| `npm run simulate:donations` | Periodic demo donations for live ledger demo |
| `npm run test` / `npm run regression` | CI parity |
| `node scripts/integration-smoke.mjs` | Live API smoke |
| `node scripts/docker-ci-smoke.mjs` | Docker stack smoke (CI) |

## Automated tests

| Layer | Command |
|-------|---------|
| Backend unit + API | `npm run test -w backend` |
| Frontend unit | `npm run test -w frontend` |
| Full regression | `npm run regression` |
| Foundry | `forge test` (repo root) |

**CI:** `.github/workflows/ci.yml` — lint, test, build, Docker smoke.  
**Deploy:** `.github/workflows/deploy.yml` → `scripts/deploy.sh` or native (`DEPLOY-NATIVE.md`).

## Data model (SQLite)

`users`, `causes`, `ledger_entries` (+ v2 columns, FTS5), `schema_migrations` — see `backend/server/db.ts`.

## Smart contracts (Foundry)

`VaultexVault.sol` deployable; **API still uses Anvil EOA vault (index 0)**, not the contract.

## Not shipped (see `CAPSTONE_TASK_TRACKER.csv`)

PDF receipts, MetaMask/Sepolia user signing in UI, microservices gateway, Playwright E2E, PDF export, email reports, NFT certs, `VAULTEX_VAULT_ADDRESS` API wiring, API-driven beneficiary stories on homepage, full public-address privacy audit, etc.

## Architecture & docs

| Doc | Topic |
|-----|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | C4, sequences |
| [ADR/](./ADR/) | Decisions |
| [openapi/](./openapi/) | Future service stubs |
| [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md) | Capstone presentation |
| [DEMO.md](./DEMO.md) | Live demo script |
