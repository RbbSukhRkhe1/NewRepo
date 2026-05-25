# Vaultex — Final Presentation Deck (ITEC631 Part B)

**Status:** FINAL — build PowerPoint from this document (Week 11 submission, one copy per team)  
**Presentation:** Monday **25 May 2026**, **3:00 pm sharp** · **10 minutes** per group · all members must attend  
**Live URL:** https://vaultex.club · backup: `npm run dev` → http://localhost:5173  
**Unit:** ITEC631 Software Engineering Masters Project Part B · ACU · Semester 1 2026

---

## Deck at a glance (10 slides)

| # | Slide title | Speaker | Time |
|---|-------------|---------|------|
| 1 | Vaultex — Transparent Hybrid Donations | Sukhan | 0:45 |
| 2 | The Problem We Solve | Sukhan | 1:00 |
| 3 | Requirements & Roles | Sukhan | 1:00 |
| 4 | Agile Delivery (Part A → Part B) | Sukhan | 0:45 |
| 5 | Architecture & Data Flow | Sukhan / Tasin | 1:00 |
| 6 | What We Built | Tasin | 1:00 |
| 7 | Testing & Validation | Tasin | 1:00 |
| 8 | **Live Demo** | Haha | 2:30 |
| 9 | Deploy, CI/CD & Distributed Design | Tasin | 1:00 |
| 10 | Limits, Roadmap & Thank You | Sukhan | 0:45 |

**Team roles:** Sukhan (lead, report, architecture) · **Haha (frontend & demo)** · Tasin (backend, chain, Q&A)

---

## Pre-flight checklist (day before)

- [ ] All team members confirmed for **May 25, 3:00 pm**
- [ ] Deck exported to PDF/PPTX and uploaded to LMS (one team copy)
- [ ] `git pull` on `main` — demo matches this doc
- [ ] Production: https://vaultex.club loads · or local `npm run dev` tested
- [ ] Seeded login ready: `admin@vaultex.local` / `demo123` (capstone demo only)
- [ ] Optional: `npm run simulate:donations` tested for live ledger updates
- [ ] Screenshot fallbacks if Wi‑Fi fails (home, causes, ledger, Impact)

---

## Course coverage map (Weeks 1–11)

| Week | Unit topic | Slide(s) |
|------|------------|----------|
| 1 | Principles of Software Engineering | 2, 10 |
| 2 | Software Processes | 4 |
| 3 | Requirements Engineering | 3 |
| 4 | Architectural Design | 5 |
| 5 | System Modeling | 5 |
| 6 | Design & Implementation | 6 |
| 7 | Software Testing | 7 |
| 8 | User Interface Evaluation | 8 |
| 9 | Software Configuration Management | 9 |
| 10 | Distributed Software Engineering | 9 |
| 11 | Project Presentations | 1–10 |

---

# SLIDE CONTENT (copy into PowerPoint)

---

## Slide 1 — Title

**Title:** Vaultex  
**Subtitle:** Hybrid Donation Transparency Platform  
**Footer:** ITEC631 Part B · Australian Catholic University · May 2026

**Bullets (optional):**

- Sukhanpreet Singh — lead, architecture, thesis
- [Haha] — frontend & UX
- [Tasin] — backend & blockchain integration
- [Fourth member if applicable]

**Speaker notes:**

> Good afternoon. We present Vaultex: a web platform where donors give in ETH, funds route through a vault, and every step is searchable on a live ledger backed by SQLite and a local Ethereum dev chain.

---

## Slide 2 — Problem

**Title:** Why transparency matters  
**Course:** Week 1 — Software engineering principles (trust, auditability, traceability)

**Bullets:**

- Donors often cannot **verify** where money goes after they give
- Annual reports and spreadsheets are slow and easy to dispute
- Beneficiaries deserve dignity—not opaque “trust us” messaging
- **Vaultex tagline:** Donate on-chain. **Help for real.**

**Speaker notes:**

> We treated transparency as a quality attribute, not a slogan. The product must record donations, vault holdings, and disbursements in one place a stranger can audit.

---

## Slide 3 — Requirements

**Title:** Requirements & stakeholders  
**Course:** Week 3 — Requirements engineering

**Bullets:**

| | |
|---|---|
| **Roles** | Admin · Donor · Beneficiary |
| **Must-have** | Auth, causes, donate, disburse, public ledger, impact campaigns |
| **Quality** | Masked addresses, sessions, real-time ledger, Docker deploy |

**User stories (show 2 on slide):**

1. As a **donor**, I donate ETH and find my gift on the ledger with a clear narrative.  
2. As **admin**, I disburse to a cause and link outgoing funds to prior donations (FIFO).  
3. As a **visitor**, I read beneficiary stories on the homepage and browse fulfilled campaigns on **Impact**.

**Speaker notes:**

> Part B refined requirements when Ledger v1 was not enough—we added narratives, full-text search, tags, and per-transaction lifecycle views for the thesis.

---

## Slide 4 — Process

**Title:** How we delivered the project  
**Course:** Week 2 — Software processes (iterative / agile)

**Bullets:**

- **ITEC630 (Part A):** literature, initiation, early prototype
- **ITEC631 (Part B):** implement, test, evaluate, report, present
- **Iterations:** Ledger v1 → Ledger v2 → WebSocket live updates → Docker CI & production deploy
- **Collaboration:** parallel frontend + backend; shared GitHub repo

**Speaker notes:**

> Each iteration ended with something demoable—never a single integration week at the end.

---

## Slide 5 — Architecture

**Title:** System architecture  
**Course:** Weeks 4–5 — Architecture & system modeling

**Diagram (put on slide):**

```
┌─────────────┐     HTTPS      ┌──────────────┐     SQL    ┌─────────┐
│  React SPA  │ ─────────────► │ Express API  │ ◄──────► │ SQLite  │
│  Vite + TS  │    /api + WS   │  sessions    │          │ ledger  │
└─────────────┘                └──────┬───────┘          └─────────┘
                                      │ ethers
                                      ▼
                               ┌──────────────┐
                               │ Anvil (dev)  │
                               │ Redis events │
                               └──────────────┘
```

**Flow (3 bullets):**

1. Donor sends ETH → **Vault** (Anvil EOA in demo)  
2. Ledger row + narrative stored in **SQLite**  
3. Admin **disbursement** → beneficiary; optional **chain_sync** from watcher  

**Speaker notes:**

> Hybrid Web2/Web3: users search the app ledger; Anvil proves we can broadcast real transactions in development. ADR documents a future strangler migration to microservices—not deployed today.

**Visual:** Export diagram from `docs/ARCHITECTURE.md` (Mermaid C4) if time permits.

---

## Slide 6 — Implementation

**Title:** Key features shipped  
**Course:** Week 6 — Design & implementation

**Bullets:**

- **Ledger v2** — reference, narrative, tags, FTS search, FIFO disbursement links  
- **Live ledger** — WebSocket `/api/ws` (no polling)  
- **Homepage** — beneficiary story carousel (4 stories), How it works, Join the Vault  
- **Impact** — fulfilled campaigns with verified ETH totals  
- **Ops** — Docker Compose (nginx, API, Redis, Anvil with persisted state)  
- **Contracts** — `VaultexVault.sol` (Foundry); API uses EOA vault today *(state clearly)*

**Speaker notes:**

> LedgerService writes human-readable sentences so markers and donors understand rows without reading raw hex.

---

## Slide 7 — Testing

**Title:** How we validated the system  
**Course:** Week 7 — Software testing

**Bullets:**

| Layer | Evidence |
|-------|----------|
| Unit / API | `npm run test` (backend + frontend) |
| Smart contracts | `forge test` |
| CI pipeline | Lint, build, Docker smoke on GitHub Actions |
| Manual | Demo script + think-aloud user sessions |

**Outcomes:**

- Donation creates ledger entry (+ chain tx when Anvil up)  
- Disbursement stores `linked_tx_ids` to prior donations  
- Production smoke: HTTPS + WebSocket on vaultex.club  

**Speaker notes:**

> We do not claim formal penetration testing—honest capstone scope with automated regression and structured manual demos.

---

## Slide 8 — Live demo

**Title:** Live demonstration  
**Course:** Week 8 — User interface evaluation

**Bullets (minimal—demo speaks):**

- Homepage: carousel + How it works  
- Donate → Ledger (real-time)  
- Impact: fulfilled campaigns  

**Demo script (2:30 — Haha):**

| Step | Route | What to say |
|------|-------|-------------|
| 1 | `/` | “Headline and CTAs; four beneficiary stories rotate—hover to pause.” |
| 2 | `/` scroll | “How it works: browse, donate, track on the ledger.” |
| 3 | `/causes` → detail | “Active campaigns with goals and progress.” |
| 4 | `/login` | “Demo account only for class.” → `admin@vaultex.local` / `demo123` |
| 5 | `/donate` or cause donate | “ETH moves on-chain; receipt appears in ledger.” |
| 6 | `/ledger` | “Search, open row, watch live update.” Run `npm run simulate:donations` if quiet. |
| 7 | `/causes/completed` | “Impact—campaigns that hit goal; totals match ledger.” |

**If Anvil offline:** “Database-led demo still works; chain watcher reconnects when RPC is up.”

**Screenshot backup:** Home, Causes, Ledger modal, Impact grid.

---

## Slide 9 — SCM & distributed systems

**Title:** Configuration management & deployment  
**Course:** Weeks 9–10 — SCM & distributed software engineering

**Bullets:**

- **Git / GitHub** — `main` branch, team PRs, reproducible builds  
- **CI/CD** — `.github/workflows/ci.yml` (test + Docker smoke)  
- **Production** — Oracle Cloud, Docker Compose, nginx TLS at **vaultex.club**  
- **Distributed behaviour today:**  
  - Redis pub/sub (`donation.created`, `disbursement.created`)  
  - WebSocket broadcast to all ledger clients  
  - Multi-container stack + persistent Anvil volume  

**Speaker notes:**

> Even in a monolith deploy, event bus and WebSocket are our first distributed boundaries—users see donations appear without refreshing.

---

## Slide 10 — Close

**Title:** Limitations & next steps  
**Course:** Week 11 — Professional communication

**Limitations (4 bullets max):**

- Demo chain (Anvil)—not Ethereum mainnet production  
- Smart contract not yet wired to API donate/disburse  
- Carousel stories are curated UX copy, not CMS-driven  
- No browser wallet (MetaMask) flow in production UI  

**Next steps:**

- Contract integration · Sepolia testnet · PDF receipts · E2E tests  

**Closing line:**

> Vaultex turns opaque giving into evidence you can search—from the homepage story to the last line on the ledger. Thank you—we welcome questions.

---

# APPENDIX (not on slides — team reference)

## A. Product routes (demo truth table)

| Route | Purpose |
|-------|---------|
| `/` | Hero, carousel, How it works, Join the Vault |
| `/causes` | Active campaigns |
| `/causes/:id` | Cause detail, donate entry |
| `/causes/completed` | **Impact** — fulfilled campaigns |
| `/donate` | Donation flow |
| `/ledger` | Public ledger v2 + live updates |
| `/account` | Wallet, history, badges |
| `/login`, `/register` | Auth (register linked from Join CTA) |
| `/admin/users` | Admin only |

**Nav:** Home · Causes · Impact · Ledger · Sign in

## B. Demo credentials

Password for all seeded users: **`demo123`**  
See `README.md` for emails (`admin@vaultex.local`, donor accounts, etc.).

## C. Commands

```bash
npm install
npm run dev                    # local demo
npm run simulate:donations     # live ledger activity (API + Anvil up)
npm run lint && npm run test   # CI parity
```

## D. Q&A rapid answers

| Question | Answer |
|----------|--------|
| Why SQLite? | Capstone monolith; documented migration path. |
| Real blockchain? | Yes on Anvil for donate/disburse; SQLite is UX source of truth. |
| vs GoFundMe? | Public searchable ledger + on-chain tx hashes + admin disbursement trail. |
| Security? | Sessions, bcrypt, role gates, masked public addresses (`docs/PRIVACY.md`). |
| Team split? | Frontend: homepage/UX; backend: API, ledger, chain; lead: thesis + architecture. |

## E. Related documents

| Document | Use |
|----------|-----|
| `docs/DEMO.md` | Alternate minute-by-minute script |
| `docs/ARCHITECTURE.md` | C4 / Mermaid for Slide 5 |
| `docs/FEATURES.md` | Full feature list |
| `docs/USER_TESTING.md` | UI evaluation template |
| `THESIS_LEDGER_V2_SECTION.md` | Thesis depth on ledger |
| `README.md` | Setup & stack |

## F. LMS submission

- Submit **one** PPTX/PDF per team before Week 11 deadline on Canvas.  
- Filename suggestion: `ITEC631_Vaultex_Presentation_Team[N].pptx`

---

*End of final deck document.*
