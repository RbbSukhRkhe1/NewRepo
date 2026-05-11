# Vaultex — architecture

## System context

```mermaid
flowchart LR
  subgraph Browser
    FE[React SPA Vite]
  end
  subgraph Node
    API[Express API]
    DB[(SQLite)]
  end
  subgraph LocalDev["Local dev optional"]
    ANV[Anvil JSON-RPC WS]
  end
  FE -->|HTTP /api proxy| API
  API --> DB
  API -->|ethers JsonRpcProvider| ANV
  API -->|WebSocketProvider watcher| ANV
```

- **Frontend** (`frontend/`): calls relative `/api/...`; Vite dev server proxies to backend **3847**.
- **Backend** (`backend/server/`): HTTP API, cookie sessions, seeding, optional chain watcher inserting `ledger_entries`.

---

## Donate flow (simplified)

```mermaid
sequenceDiagram
  participant U as Donor browser
  participant V as Vite dev
  participant A as Express API
  participant D as SQLite
  participant C as Anvil optional

  U->>V: POST /api/donate via fetch
  V->>A: proxy to :3847
  A->>D: insert ledger + update cause
  A->>C: optional signed tx from seeded wallet
  A-->>U: JSON tx hash summary
```

*Exact steps depend on `app.ts` implementation; this matches the mental model: persist intent + chain interaction when RPC works.*

---

## Admin disburse flow (simplified)

```mermaid
sequenceDiagram
  participant Ad as Admin browser
  participant A as Express API
  participant D as SQLite
  participant C as Anvil

  Ad->>A: POST /api/disburse
  A->>D: validate beneficiary + record ledger
  A->>C: send value to beneficiary address
  A-->>Ad: result + tx hash
```

---

## Chain watcher (optional)

When `ANVIL_WS_URL` / RPC is reachable, the watcher subscribes to new blocks and inserts matching transfers as `chain_sync` rows (see `backend/server/watcher.ts`). If Anvil is down, the API may log a warning and continue without crashing (behavior may evolve—check logs).

---

## Key files

| Area | Path |
|------|------|
| Routes + handlers | `backend/server/app.ts` |
| DB schema / open | `backend/server/db.ts` |
| Seed users / causes | `backend/server/seed.ts` |
| Masking + labels | `backend/server/resolve.ts` |
| Anvil key derivation | `backend/server/anvil.ts` |
| Entry + watcher start | `backend/server/index.ts` |
| SPA routes | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.ts` |
