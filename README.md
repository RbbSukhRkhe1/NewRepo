# Valutex Web3 Neobanking MVP

Week 2–3: Supabase/SQLite hybrid, ValutexVault on Base Sepolia, optional **Privy + gasless donations** when `USE_USEROP=true`. The UI uses **`@privy-io/react-auth` only** (no `wagmi` bundle—in Vite 8 + wagmi v3, `wagmi/tempo` targets `viem/tempo/zones`, which mismatched our viem export map and broke production builds).

## Architecture (text diagram)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browser · React 19 + Vite + Tailwind + React Router                         │
│  · Public pages: causes, ledger, overview                                  │
│  · Auth: cookie-session + `/api/auth/login` OR Privy (`VITE_PRIVY_APP_ID`) →│
│          `/api/auth/privy` (identity token ↔ seeded `users.email`)          │
│  · USE_USEROP=false: Anvil donors call `/api/donate` (server signs)         │
│  · USE_USEROP=true: donors `sendTransaction(..., { sponsor:true })` →      │
│          `/api/donate/confirm` (verifies ERC-4626 `Deposit` log)            │
│  · Disburse: remains server `PRIVATE_KEY` vault tx (pays gas); Privy path  │
│    is documented for future treasury-key migration only.                    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ fetch /api/*  (Vite dev proxy → Express)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  API · Express (createApp)                                                    │
│  · Rate limits on login + mutate endpoints                                    │
│  · Public: GET /api/config, /api/overview, /api/ledger                      │
│  · Health:    GET /api/health  → DB + chain + vault + `aa` (Pimlico/Privy cfg)│
│  · AA proxy:  POST /api/aa/rpc (auth) → Pimlico JSON-RPC allowlist          │
│  · Vault info: GET /api/vault  → contract reads (vault mode)                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────────┐           ┌───────────────────────────────┐
│  DB Service (server/db.ts)   │           │  Blockchain (server/blockchain)│
│  · USE_SUPABASE=false →      │           │  · CHAIN_TX_MODE=eoa →         │
│    SQLite (better-sqlite3)   │           │    ethers + ANVIL_RPC native   │
│  · USE_SUPABASE=true →       │           │  · CHAIN_TX_MODE=vault →       │
│    Supabase service role     │           │    viem + BASE_SEPOLIA_RPC +  │
│  · DUAL_WRITE_SQLITE=true →  │           │    ValutexVault deposit/withdraw│
│    mirror writes (migration) │           │  · Watcher: Anvil WS → ledger   │
└─────────────────────────────┘           └───────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Supabase (optional primary) │
│  · RLS: see server/db/       │
│    supabase.ts SQL comments  │
└─────────────────────────────┘

  server/aa.ts: Pimlico HTTP proxy + probes; client can also use Privy `sponsor:true` alone
```

### Supabase column for Privy

If you use Supabase, add `embedded_wallet_address` to `users` (SQLite migrates automatically):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS embedded_wallet_address text;
```

### Privy + Pimlico (free tiers)

1. **Privy Dashboard** (https://dashboard.privy.io): create an app, enable **Email + Google**, **Embedded wallets**, **Base Sepolia**. Copy **App ID** into `VITE_PRIVY_APP_ID` and `PRIVY_APP_ID`; copy **App secret** into `PRIVY_APP_SECRET` (server only).
2. In **Paymaster / Smart wallet** settings, turn on **transaction sponsorship** / testnet gas for Base Sepolia so `sendTransaction(..., { sponsor: true })` succeeds.
3. **Pimlico** (https://pimlico.io): create an API key, set `PIMLICO_API_KEY` for `/api/aa/rpc` bundler/proxy (optional if you rely only on Privy’s built-in sponsorship).
4. Set `USE_USEROP=true`, `CHAIN_TX_MODE=vault`, fund the embedded wallet with vault **underlying asset** (ERC-20) + allowance; native ETH balance on Base is optional for pure contract `deposit` flows that pull ERC-20.

### Install note

If `npm install` reports peer conflicts between Privy and viem, use:

```bash
npm install --legacy-peer-deps
```

### Health checks

- **`GET /api/health`** — JSON report for ops/monitoring:
  - **`db`**: `primary` (`supabase` | `sqlite`), `dualWriteSqlite`, `reachable` (lightweight query)
  - **`chain`**: `mode` (`eoa` | `vault`), `useUserOp`, **`rpc`** probe (Anvil when `eoa`, Base Sepolia when `vault`)
  - **`vault`**: ERC-4626 connection (`connection`: `ok` | `skipped` | `error`), `balanceEth` when readable
  - **`aa`**: `useUserOp`, Pimlico probe (`pimlico.configured` / `reachable`), `privyServerReady` (both `PRIVY_APP_ID` and `PRIVY_APP_SECRET` set), `privyAppIdSet`
  - HTTP **`503`** if DB unreachable, RPC unreachable, or vault read fails in vault mode; **`200`** otherwise

- **`GET /health`** (root) — minimal `{ ok: true }` for simple liveness (unchanged).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Local chain (optional for eoa mode):
```bash
anvil --host 127.0.0.1 --port 8545
```

4. Start app:
```bash
npm run dev
```

## Supabase setup (free tier)

1. Create a free Supabase project.
2. Fill these in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In Supabase SQL Editor, run migration SQL from `server/db/supabase.ts` comment block.
4. Enable Supabase mode:
   - `USE_SUPABASE=true`
   - `DUAL_WRITE_SQLITE=true` (temporary during migration)
5. Restart API.

## DB mode switching

- SQLite primary (legacy/local only):
  - `USE_SUPABASE=false`
- Supabase primary:
  - `USE_SUPABASE=true`
- Transition safety:
  - `DUAL_WRITE_SQLITE=true` to write both stores while validating parity

## Contract deployment (Base Sepolia)

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-git
forge script script/Deploy.s.sol:DeployValutexVault --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

After deploy:
1. Copy deployed vault address to `.env` as `VAULT_CONTRACT_ADDRESS`.
2. Set `CHAIN_TX_MODE=vault`.
3. Restart API.
4. Hit `/api/vault` to verify contract + balance reads.

## Quality commands

- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `npm audit --omit=dev`
- `cd contracts && forge build && forge test`