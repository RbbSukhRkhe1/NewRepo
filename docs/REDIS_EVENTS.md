# Redis — inter-service events

Vaultex uses **Redis pub/sub** as a thin event bus for future microservices. The API process can **publish**; separate workers (or other services) can **subscribe**.

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `REDIS_URL` | `redis://localhost:6379` | Broker URL |
| `REDIS_EVENTS_CHANNEL` | `vaultex:events` | Single channel for all domain events |
| `REDIS_DISABLED` | unset | Set to `1` or `true` to skip Redis (no-op publish) |

See `backend/.env.example`.

## Start Redis (Docker)

From the **repository root**:

```bash
docker compose up -d redis
```

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

- **Publisher / subscriber helpers:** `backend/server/lib/redis.ts`
- **`publishEvent(type, data)`** — use after successful DB/chain side effects (idempotent consumers recommended).

Subscribers should run in **separate processes** from the HTTP server to avoid blocking the Node event loop on slow handlers.
