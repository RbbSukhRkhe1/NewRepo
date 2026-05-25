# OpenAPI stubs (Vaultex)

**Last updated:** May 2026.

Placeholder **OpenAPI 3.0.3** specs for the **target** microservice layout. They are **not** generated from the running monolith yet — use them to align contracts before strangler cutovers.

**Running system:** see [FEATURES.md](../FEATURES.md) and [ARCHITECTURE.md](../ARCHITECTURE.md) for actual routes (including Ledger v2 and WebSocket, which are not fully reflected in these stubs).

| File | Role |
|------|------|
| [gateway.yaml](gateway.yaml) | Public entry / routing (future) |
| [auth-service.yaml](auth-service.yaml) | Auth bounded context |
| [users-service.yaml](users-service.yaml) | Users / profiles |
| [causes-service.yaml](causes-service.yaml) | Causes catalog + admin CRUD |
| [ledger-service.yaml](ledger-service.yaml) | Transparency ledger |
| [blockchain-service.yaml](blockchain-service.yaml) | Chain RPC + watcher |

**Validate locally** (with [Redocly CLI](https://redocly.com/docs/cli/) or similar):

```bash
npx @redocly/cli lint docs/openapi/gateway.yaml
```

Replace placeholder ports and paths when services are implemented.
