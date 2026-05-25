# Vaultex documentation

**Last updated:** May 2026 · matches `main` (homepage with beneficiary carousel; Impact = fulfilled campaigns).

Task ownership and priorities: **`../CAPSTONE_TASK_TRACKER.csv`** (repo root). Columns include **Description**, **Detailed_Prompt**, and story points.

## Start here

| Audience | Doc |
|----------|-----|
| **Presentation (May 25)** | [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md) — **final** 10-slide deck + live demo script |
| **Quick live demo** | [DEMO.md](./DEMO.md) — shorter run-through (links to presentation doc) |
| **What ships today** | [FEATURES.md](./FEATURES.md) — API routes, UI routes, tests |
| **Run / deploy** | [../README.md](../README.md) — install, Docker, seeded accounts |

## Index

| Doc | Purpose |
|-----|---------|
| [FEATURES.md](./FEATURES.md) | Shipped vs not shipped (API, UI, data model) |
| [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md) | ITEC631 final presentation (10 min, course week map) |
| [DEMO.md](./DEMO.md) | Condensed demo script for markers and rehearsals |
| [PRIVACY.md](./PRIVACY.md) | Masking, roles, data handling |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | C4 containers, sequences, key files |
| [ADR/](./ADR/) | Architecture decision records |
| [openapi/](./openapi/) | Stub OpenAPI 3 specs for future services |
| [COMPARATIVE.md](./COMPARATIVE.md) | Positioning vs related approaches |
| [USER_TESTING.md](./USER_TESTING.md) | Usability session template |
| [ANVIL_STATE.md](./ANVIL_STATE.md) | Repeatable Anvil demos |
| [REDIS_EVENTS.md](./REDIS_EVENTS.md) | Redis pub/sub + browser WebSocket |
| [DEPLOY.md](./DEPLOY.md) | Docker Compose deploy (Oracle Cloud) |
| [DEPLOY-NATIVE.md](./DEPLOY-NATIVE.md) | nginx + Node + Anvil (production default) |
| [../blockchain/README.md](../blockchain/README.md) | Solidity / Foundry layout |

## Production URL

- **https://vaultex.club** — native deploy (nginx TLS, API proxy, SPA)
- Local dev: **http://localhost:5173** (`npm run dev`) or **http://localhost:8080** (Docker Compose)

## Presentation week reminders

- **Monday 25 May 2026, 3:00 pm sharp** — 10 minutes per group; all members must attend
- Submit **one** slide deck per team to LMS (Week 11)
- Demo password (seeded accounts only): **`demo123`** — see root README
