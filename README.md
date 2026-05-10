# Vaultex (live-tx-ledger)

Monorepo with separate folders for the **web app**, **API**, and **smart contracts** so each part can be developed independently.

| Folder | Contents |
|--------|----------|
| `frontend/` | React + TypeScript + Vite |
| `backend/` | Express API (`server/`), SQLite data under `server/data/` |
| `blockchain/` | Foundry project (Solidity, `lib/`, build artifacts) |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended) and **npm**
- **Optional:** [Foundry](https://book.getfoundry.sh/getting-started/installation) to compile or deploy contracts under `blockchain/`
- **Optional:** a local chain such as [Anvil](https://book.getfoundry.sh/reference/anvil/) on `http://127.0.0.1:8545` if you use on-chain features (the API defaults to that RPC/WebSocket)

---

## Install

From the **repository root**:

```bash
npm install
```

This uses npm workspaces and installs dependencies for **frontend** and **backend** in one go.

---

## Run the app (recommended)

Start **API + Vite** together (API on port **3847**, Vite proxies `/api` to it):

```bash
npm run dev
```

Then open the URL printed by Vite (usually **http://localhost:5173**).

---

## Run services separately

| Goal | Command (from repo root) |
|------|---------------------------|
| Frontend only | `npm run dev:web` |
| Backend only | `npm run dev:api` |

The Vite dev server proxies `/api/*` to `http://127.0.0.1:3847`, so for full UI behavior you normally run the backend too (or use `npm run dev`).

---

## Environment variables (backend)

Set these only if you need non-defaults (e.g. production):

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP port for the API | `3847` |
| `SQLITE_PATH` | SQLite database file path | `backend/server/data/donate.db` (relative to server code) |
| `ANVIL_RPC_URL` | JSON-RPC for the chain | `http://127.0.0.1:8545` |
| `ANVIL_WS_URL` | WebSocket URL for logs (optional) | Derived from `ANVIL_RPC_URL` |
| `SESSION_SECRET` | Cookie session signing | dev placeholder if unset |

You can use a `.env` file in **`backend/`** (loaded by `dotenv` when the API starts).

---

## Other scripts (from repo root)

| Script | What it does |
|--------|----------------|
| `npm run build` | Production build of the frontend → `frontend/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint on `frontend/` |

---

## Blockchain (contracts)

Work inside **`blockchain/`**. Typical Foundry commands (when your `foundry.toml` and sources are set up):

```bash
cd blockchain
forge build
forge test
```

---

## Troubleshooting

- **`better-sqlite3` install errors:** Use a supported Node version; on Windows you may need build tools for native addons.
- **API connection errors in the browser:** Ensure the backend is running on port `3847`, or set `PORT` and update `frontend/vite.config.ts` proxy `target` to match.
