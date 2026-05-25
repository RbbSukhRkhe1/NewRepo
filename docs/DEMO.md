# Vaultex — demo script

**Primary deck:** [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md) (final 10-minute presentation, May 25 2026).  
**Use this file** for a shorter rehearsal or a marker walkthrough without slides.

**Audience:** marker, sponsor, or classmates.  
**Prereqs:** `npm install`, `npm run dev`; optional Anvil on **8545** (host) or **4585** (Docker Compose).  
**Production:** https://vaultex.club · **Local:** http://localhost:5173

---

## One-line stack

> React + Express + SQLite, optional Anvil for real txs, Redis + WebSocket for live ledger updates.

---

## Speaker split

| Person | Focus |
|--------|--------|
| Sukhan | Problem, architecture, close, Q&A backup |
| Haha | Homepage, carousel, causes, donate, Impact |
| Tasin | Ledger, API, chain, testing, technical Q&A |

---

## Live demo path (~3 min)

| Step | Route | What to show |
|------|-------|----------------|
| 1 | `/` | **“Donate on-chain. Help for real.”** · CTAs · **beneficiary carousel** (4 stories; hover to pause) |
| 2 | `/` scroll | **How it works** — trust points + Browse / Donate / Track impact |
| 3 | `/causes` → `/:id` | Active campaign, progress |
| 4 | `/login` | `admin@vaultex.local` / `demo123` *(capstone demo only)* |
| 5 | `/donate` or cause donate | Donation + receipt |
| 6 | `/ledger` | Search, open row, **live update** (see below) |
| 7 | `/causes/completed` | **Impact** — fulfilled campaigns (not the homepage carousel) |

**Live ledger tip:** With API running, in another terminal:

```bash
npm run simulate:donations
```

(requires seeded donors and Anvil — see root README)

---

## Extended run (~7 min)

| Time | Action |
|------|--------|
| 0:00 | State stack in one sentence |
| 0:45 | Open site (prod or localhost) |
| 1:15 | Homepage carousel + How it works |
| 1:45 | Causes → one cause detail |
| 2:15 | Login (seeded account) |
| 2:45 | Donate or explain admin disburse |
| 3:45 | Ledger — masking, narratives, WebSocket refresh |
| 4:30 | Account — history / badges |
| 5:00 | Impact page |
| 5:30 | Optional: `/admin/users` if admin |
| 6:00 | Limitations — local chain, curated carousel copy, `docs/PRIVACY.md` |
| 6:45 | Q&A |

---

## Backup if chain is offline

- Still demo: causes, login, ledger (from DB), account, Impact.
- Say: “Watcher connects when Anvil RPC is up; today we are showing app-led accountability.”

---

## Seeded credentials (capstone only)

**Password:** `demo123` for all seeded users.

| Role | Email |
|------|--------|
| Admin | `admin@vaultex.local` |
| Donors | `haha@vaultex.local`, `sukhan@vaultex.local`, `tasin@vaultex.local` |

Full table: root [README.md](../README.md#demo--seeded-accounts).

---

## Honest limitations (say aloud)

- Anvil / demo chain — not Ethereum mainnet production
- Homepage stories are **curated UX copy**, not CMS-driven from API
- `VaultexVault.sol` exists; API still uses EOA vault on Anvil
- Register is via **Join the Vault** / `/register`, not in top nav

---

## Related docs

| Doc | Use |
|-----|-----|
| [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md) | Full slide copy + course week map |
| [FEATURES.md](./FEATURES.md) | Route list |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diagrams for Q&A |
