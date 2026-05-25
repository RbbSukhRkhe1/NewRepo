# Redis — inter-service events

Vaultex uses **Redis pub/sub** as a thin event bus for future microservices. The API process can **publish**; separate workers (or other services) can **subscribe**.

The **browser** does not subscribe to Redis directly. The SPA opens a **WebSocket** at **`/api/ws`**; the API forwards in-process and Redis-backed events to connected clients (see `frontend/src/lib/useVaultexEvents.ts`). Ledger and related pages refresh when `donation.created` / `disbursement.created` fire—**no polling interval** on those screens.

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `REDIS_URL` | `redis://localhost:6379` | Broker URL |
| `REDIS_EVENTS_CHANNEL` | `vaultex:events` | Single channel for all domain events |
| `REDIS_DISABLED` | unset | Set to `1` or `true` to skip Redis (no-op publish) |

See `backend/.env.example`.

## Start Redis (Docker)

The root **`docker-compose.yml`** runs **Redis as part of the full stack** (`docker compose up --build` — see the root **README**). Inside that stack the API should use **`REDIS_URL=redis://redis:6379`** (the compose default).

**Redis only** (API on the host):

```bash
docker run -d --name vaultex-redis -p 6379:6379 redis:7-alpine redis-server --save "" --appendonly no
```

Then set **`REDIS_URL=redis://127.0.0.1:6379`** in `backend/.env`.
## Event envelope (wire schema)

Every message on `vaultex:events` (or `REDIS_EVENTS_CHANNEL`) is JSON:

```json
{
  "v": 1,
  "type": "donation.created",
  "data": {
    "txHash": "0x…",
    "amountEth": "0.1",
    "causeId": 3,
    "userId": 2
  },
  "ts": "2026-05-11T12:00:00.000Z"
}
```

- **`v`**: schema version (currently `1`).
- **`type`**: event name (convention: `domain.action`, lowercase).
- **`data`**: arbitrary JSON-serializable payload (keep small; reference IDs not large blobs).
- **`ts`**: ISO-8601 timestamp when published.

### Example event types (roadmap)

| `type` | Example `data` |
|--------|------------------|
| `donation.created` | `{ txHash, amountEth, causeId, userId }` |
| `disbursement.created` | `{ txHash, amountEth, beneficiaryUserId, causeName }` |
| `ledger.entry` | `{ txHash, kind }` |

## Code

| Piece | Path |
|-------|------|
| Publisher / local bus | `backend/server/lib/redis.ts` |
| **`publishEvent(type, data)`** | After successful DB/chain side effects |
| WebSocket upgrade | `backend/server` (mounted on `/api/ws`) |
| Frontend hook | `frontend/src/lib/useVaultexEvents.ts` |

**`REDIS_DISABLED=1`:** publish is skipped; WebSocket may still receive **in-process** events on the same API instance.

Future microservice subscribers should run in **separate processes** from the HTTP server to avoid blocking the Node event loop on slow handlers.
