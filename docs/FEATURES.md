# Vaultex — feature inventory (shipped vs roadmap)

This document reflects the **monolith** in `frontend/` + `backend/server/` as of the last manual audit. Update when major behavior changes.

## Shipped — backend (Express, `/api`)

| Feature | Routes / behavior |
|---------|-------------------|
| Public config | `GET /config` — vault address + masked |
| Overview stats | `GET /overview` — cause aggregates, ledger sums, optional vault balance |
| Auth | `POST /auth/login`, `POST /auth/logout`, `POST /auth/register`, `GET /auth/me` |
| Users (admin) | `GET /users` |
| Causes | `GET /causes`, `GET /causes/:id`, `POST /causes` (admin) |
| Donate | `POST /donate` (signed-in + Anvil wallet) → chain tx + ledger + cause `raised_eth` |
| Disburse | `POST /disburse` (admin) → chain tx + ledger |
| Public ledger | `GET /ledger` (up to 500 rows, masked + display names) |
| User history | `GET /me/history` — entries involving user address + summary |
| Balance | `GET /balance/:anvilIndex` (0–9) |
| Health | `GET /health` (root app, not under `/api`) — liveness |
| Readiness | `GET /ready` (root) — SQLite `quick_check` + optional `eth_chainId` to `ANVIL_RPC_URL` (1.5s); `rpc` is `skipped` if `READY_SKIP_RPC` or if DB check failed first; use for Docker/Kubernetes readiness |
| Chain watcher | Optional WebSocket ingest → `chain_sync` ledger rows when Anvil up |
| Seeding | First-run users + `seedCausesUpsert` for five marketing causes |
| Redis pub/sub | After successful donate/disburse, publishes `donation.created` / `disbursement.created` (see `server/lib/redis.ts`, `docs/REDIS_EVENTS.md`; disable with `REDIS_DISABLED=1`) |

## Shipped — frontend (React Router)

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/login`, `/register` | Auth |
| `/causes`, `/causes/:id` | Browse / detail |
| `/causes/new`, `/admin/causes/new` | New cause (auth / admin) |
| `/donate` | Donation flow |
| `/ledger` | Public ledger UI |
| `/account` | Account + admin disburse tooling |
| `/admin/users` | Admin user list |

**UX:** Layout nav, dark/light theme persistence, admin dropdown.

## Data model (SQLite)

`users`, `causes`, `ledger_entries` — see `backend/server/db.ts`.

## Smart contracts (Foundry, repo root)

- **`foundry.toml`** + **`remappings.txt`** at monorepo root; sources under **`blockchain/src/`** (e.g. `VaultexVault.sol`), deploy **`blockchain/script/Deploy.s.sol`**, tests **`blockchain/test/`**, libs **`blockchain/lib/`**.
- Run **`forge build`** / **`forge test`** from the **repository root**. Build outputs under `blockchain/out/` (gitignored until you compile).

## Not shipped (see `CAPSTONE_TASK_TRACKER.csv`)

Examples: journey-by-tx API, strict public masking audit, PDF receipts, WS live ledger, microservices split, CI/CD, E2E tests, MetaMask testnet toggle, NFT receipts, backend wiring to `VAULTEX_VAULT_ADDRESS`, etc.

## Architecture and contracts

For **how pieces fit today** versus the **gateway + services** target, see [ARCHITECTURE.md](./ARCHITECTURE.md). Decisions (strangler ordering, cookies vs JWT at the gateway) live under [ADR/](./ADR/). Placeholder **OpenAPI** contracts for the target split are in [openapi/](./openapi/).
