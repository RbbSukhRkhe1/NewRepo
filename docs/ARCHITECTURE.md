# Vaultex — architecture

This document describes **what runs today** (monolith + optional infra) and the **target decomposition** from the capstone roadmap. See [ADR/](ADR/) for decisions and [openapi/](openapi/) for API sketches.

---

## C4 Container — current deployment + target services

*Implemented paths are solid; the “future” boundary is the capstone target (not deployed as separate processes yet).*

```mermaid
C4Container
title Vaultex — C4 containers (current + target)

Person(user, "User", "Donor, admin, or beneficiary in the browser.")

System_Boundary(deployed, "Deployed today") {
  Container(spa, "Web SPA", "React, TypeScript, Vite", "UI; calls /api with credentials; Vite proxy in dev.")
  Container(api, "Monolith API", "Node.js, Express 5", "Auth, users, causes, donate, disburse, ledger, balance, health; cookie sessions; Redis publish; ethers signer + optional block watcher.")
  ContainerDb(sqlite, "SQLite", "better-sqlite3", "users, causes, ledger_entries.")
}

System_Boundary(infra, "Infrastructure (typical local dev)") {
  Container(redis, "Redis", "Redis 7", "Pub/sub vaultex:events; optional via REDIS_DISABLED.")
  Container(anvil, "Anvil", "Foundry", "JSON-RPC + WebSocket for txs and watcher.")
}

System_Boundary(target, "Target — strangler microservices") {
  Container(gw, "API Gateway", "TBD", "TLS, routing, rate limits; forwards to internal HTTP services.")
  Container(s_auth, "Auth service", "TBD", "Register, login, session or token bridge.")
  Container(s_users, "Users service", "TBD", "Profiles, roles, anvil_index.")
  Container(s_causes, "Causes service", "TBD", "Causes CRUD and raised_eth.")
  Container(s_ledger, "Ledger service", "TBD", "Ledger API, exports, journey-by-tx.")
  Container(s_chain, "Blockchain service", "TBD", "Watcher, tx broadcast, RPC config.")
}

Rel(user, spa, "Uses", "HTTPS")
Rel(spa, api, "JSON", "/api")
Rel(api, sqlite, "SQL", "")
Rel(api, redis, "TCP", "optional publish")
Rel(api, anvil, "HTTP/WS", "optional")

Rel(gw, s_auth, "Routes", "future")
Rel(gw, s_users, "Routes", "future")
Rel(gw, s_causes, "Routes", "future")
Rel(gw, s_ledger, "Routes", "future")
Rel(gw, s_chain, "Routes", "future")
Rel_L(gw, api, "Strangler", "per-path cutover from monolith")
Rel(s_ledger, redis, "Pub/Sub", "future consumers")
Rel(s_chain, anvil, "RPC/WS", "future")
```

**Reading the diagram**

| Element | Today | Target |
|---------|--------|--------|
| **Web SPA** | Same; may later call gateway URL instead of monolith. | Unchanged UX; base URL may change. |
| **Monolith API** | Hosts all `/api` routes and bounded-context logic in `app.ts` + modules. | Shrinks as routes move behind **API Gateway**; eventual retirement or “BFF” role. |
| **SQLite** | Single file; all tables. | Split per service or keep read models — ADR TBD. |
| **Redis** | In-process **publish** after donate/disburse. | **Bus** between services + workers (see `REDIS_EVENTS.md`). |
| **Anvil** | Used by monolith for txs + watcher. | Prefer **Blockchain service** owning RPC + watcher. |
| **Gateway + 5 services** | Not in repo yet; tracker items M-001…M-007. | Strangler: extract **read-heavy** or **stable** slices first (often ledger read + causes). |

If your Mermaid renderer does not support **C4** syntax, use the fallback below (equivalent intent).

### Fallback: flowchart (universal Mermaid)

```mermaid
flowchart TB
  U([User])
  SPA[Web SPA<br/>React + Vite]
  API[Monolith API<br/>Express 5]
  DB[(SQLite)]
  R[(Redis pub/sub)]
  A[(Anvil)]

  subgraph today["Deployed today"]
    SPA
    API
    DB
  end

  R --- API
  A --- API
  U --> SPA --> API --> DB

  subgraph future["Target — strangler fig"]
    GW[API Gateway]
    AUTH[Auth]
    USERS[Users]
    CAUSES[Causes]
    LEDGER[Ledger]
    BCHAIN[Blockchain]
  end

  GW -.->|future routes| API
  AUTH -.-> GW
  USERS -.-> GW
  CAUSES -.-> GW
  LEDGER -.-> GW
  BCHAIN -.-> GW
  LEDGER -.-> R
  BCHAIN -.-> A
```

---

## System context (current)

```mermaid
flowchart LR
  subgraph Browser
    FE[React SPA]
  end
  subgraph Node["Node (single process)"]
    API[Express API]
    DB[(SQLite)]
    RED[(Redis optional)]
  end
  subgraph LocalDev["Local dev optional"]
    ANV[Anvil RPC + WS]
  end
  FE -->|HTTP /api| API
  API --> DB
  API -->|publishEvent| RED
  API -->|ethers| ANV
  API -->|watcher| ANV
```

- **Frontend** (`frontend/`): `fetch('/api/...')`; Vite proxies to **3847** in dev.
- **Backend** (`backend/server/`): one HTTP server; cookie sessions; optional Redis; optional chain watcher.

---

## Donate flow (current)

```mermaid
sequenceDiagram
  autonumber
  participant U as Donor browser
  participant V as Vite dev
  participant A as Express API
  participant D as SQLite
  participant C as Anvil
  participant R as Redis

  U->>V: POST /api/donate
  V->>A: proxy
  A->>D: INSERT ledger + UPDATE cause
  A->>C: signed tx to vault EOA
  opt Redis not disabled
    A->>R: publish donation.created (best-effort)
  end
  A-->>U: 200 JSON txHash
```

*If Anvil is unreachable, donate fails at chain step. If Redis is down or disabled, publish is skipped or best-effort (logged); HTTP response still returns after successful DB + chain.*

---

## Admin disburse flow (current)

```mermaid
sequenceDiagram
  autonumber
  participant Ad as Admin browser
  participant A as Express API
  participant D as SQLite
  participant C as Anvil
  participant R as Redis

  Ad->>A: POST /api/disburse
  A->>D: INSERT ledger
  A->>C: vault → beneficiary tx
  opt Redis not disabled
    A->>R: publish disbursement.created (best-effort)
  end
  A-->>Ad: 200 JSON txHash
```

---

## Target donate flow (conceptual — after gateway + services)

```mermaid
sequenceDiagram
  participant U as Browser
  participant GW as API Gateway
  participant L as Ledger svc
  participant BC as Blockchain svc
  participant R as Redis

  U->>GW: POST /donate
  GW->>L: authorize + record intent
  GW->>BC: execute chain leg
  BC->>R: publish donation.created
  GW-->>U: 200
```

*Exact boundaries TBD; use ADR-0001 strangler ordering.*

---

## Chain watcher (optional)

When RPC/WS to Anvil is up, `watcher.ts` ingests blocks and writes `chain_sync` rows. See `backend/server/watcher.ts`.

---

## Key files (current)

| Area | Path |
|------|------|
| Routes + handlers | `backend/server/app.ts` |
| Network + RPC resolution | `backend/server/config.ts` |
| DB schema | `backend/server/db.ts` |
| Seed | `backend/server/seed.ts` |
| Masking | `backend/server/resolve.ts` |
| Anvil keys | `backend/server/anvil.ts` |
| Entry + shutdown | `backend/server/index.ts` |
| Readiness (`GET /ready`) | `backend/server/health.ts` |
| Redis | `backend/server/lib/redis.ts` |
| SPA routes | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.ts` |
| Foundry | `foundry.toml`, `remappings.txt`, `blockchain/src/` |

---

## Further reading

| Doc | Topic |
|-----|--------|
| [ADR/0001-microservices-strangler-fig.md](ADR/0001-microservices-strangler-fig.md) | Strangler evolution |
| [ADR/0002-session-strategy.md](ADR/0002-session-strategy.md) | Cookie vs JWT at gateway |
| [openapi/](openapi/) | Stub OpenAPI specs |
| [REDIS_EVENTS.md](REDIS_EVENTS.md) | Event envelope |
