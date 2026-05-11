# Vaultex

**Vaultex** is a capstone-style web app for **transparent charitable giving**: donors fund causes, funds flow through a **Vaultex** routing account (modeled against a local Ethereum dev chain), and admins can **disburse** to beneficiary organizations. A **live ledger** combines in-app events with optional **chain sync** when Anvil is available.

The codebase name in `package.json` is `live-tx-ledger`; product name in the UI is **Vaultex**.

---

## What’s in the box

| Area | Stack |
|------|--------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router |
| **Backend** | Express 5, `better-sqlite3`, cookie sessions, bcrypt, ethers v6 |
| **Chain (local dev)** | [Anvil](https://book.getfoundry.sh/reference/anvil/) — JSON-RPC + WebSocket for the block watcher |
| **Contracts** | Foundry-style layout under `blockchain/` (see note below) |

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: causes, donate flow, ledger, account, admin |
| `backend/server/` | REST API, SQLite schema, seeding, chain watcher |
| `blockchain/` | Forge artifacts, `lib/` (OpenZeppelin, forge-std), `broadcast/`, `cache/`, `out/` |

**Note:** The repo currently has **build/deploy outputs** under `blockchain/` but no top-level `foundry.toml` / `src/` in this snapshot. To compile from source you may need to restore or add contract sources and a root Foundry config; `forge build` in `blockchain/` may not succeed until that exists.

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
- **Optional:** [Foundry](https://book.getfoundry.sh/getting-started/installation) + **Anvil** on `http://127.0.0.1:8545` for chain-linked features and the watcher (without it the API still runs; the watcher may skip or log connection issues).

---

## Install

From the **repository root**:

```bash
npm install
```

Uses **npm workspaces** (`frontend`, `backend`).

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
| `ANVIL_RPC_URL` | HTTP JSON-RPC | `http://127.0.0.1:8545` |
| `ANVIL_WS_URL` | WebSocket for logs | Derived from `ANVIL_RPC_URL` (`http` → `ws`) |
| `SESSION_SECRET` | Session cookie signing | dev fallback in code (set in production) |

---

## Documentation

| Doc | Description |
|-----|---------------|
| [docs/README.md](docs/README.md) | Index of all docs |
| [docs/DEMO.md](docs/DEMO.md) | ~7 min demo script + slide outline |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Masking, roles, data handling |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Context + Mermaid sequences |
| [docs/COMPARATIVE.md](docs/COMPARATIVE.md) | Positioning vs other approaches |
| [docs/USER_TESTING.md](docs/USER_TESTING.md) | Usability session template + results table |
| [docs/ANVIL_STATE.md](docs/ANVIL_STATE.md) | Saving / restoring local Anvil state |

---

## Other npm scripts (root)

| Script | What it does |
|--------|----------------|
| `npm run build` | Production build → `frontend/dist` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint in `frontend/` |

---

## Capstone planning

Team task breakdown (owners, priorities, descriptions, and copy-paste prompts) lives in **`CAPSTONE_TASK_TRACKER.csv`** — open in Excel or any spreadsheet tool.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **`better-sqlite3` fails to install** | Use Node 20 LTS; on Windows install **Desktop development with C++** build tools if prebuilds miss. |
| **Browser `/api` errors** | Confirm backend is on **3847** or change `PORT` and Vite `proxy.target` together. |
| **Chain watcher warnings** | Start **Anvil**; check `ANVIL_RPC_URL` / firewall. The HTTP API can still work for many flows. |

---

## License / course use

Private capstone repository — use and attribution per your course policy.
