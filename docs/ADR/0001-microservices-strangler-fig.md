# ADR-0001: Microservices evolution via Strangler Fig

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-05-07 |
| **Context** | Vaultex ships as a **single Express monolith** with SQLite, optional Redis pub/sub, and optional Anvil. The capstone roadmap (see `CAPSTONE_TASK_TRACKER.csv`) calls for **multiple services** plus an **API Gateway** without a risky “big bang” rewrite. |
| **Decision** | Adopt the **Strangler Fig** pattern: introduce an **API Gateway** as the **single public entry** for HTTP traffic, then **migrate route families** (e.g. `/api/ledger`, `/api/causes`) one slice at a time to dedicated services. The monolith remains authoritative until each slice reaches **parity** (behavior, authz, observability). Use **Redis pub/sub** (already present for `donation.created` / `disbursement.created`) as the **integration spine** for asynchronous fan-out until a heavier bus is justified. |
| **Consequences** | **Positive:** incremental risk; demos keep working; team can parallelize per bounded context. **Negative:** temporary **dual paths** (gateway → monolith vs gateway → service); need strict **contract tests** and OpenAPI alignment (`docs/openapi/`). **Neutral:** data ownership must be clarified per slice (shared SQLite vs per-service DB — follow-up ADR). |

## Migration order (recommended, not binding)

1. **Read-heavy, low-write** paths first (e.g. public ledger GET) behind gateway proxy to monolith, then swap implementation to Ledger service.
2. **Causes** CRUD next (clear schema boundary).
3. **Auth** last or with careful **session bridge** (see ADR-0002) — highest coupling to browser cookies today.

## Links

- Diagram: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- Tasks: `M-001` … `M-007` in `CAPSTONE_TASK_TRACKER.csv`
