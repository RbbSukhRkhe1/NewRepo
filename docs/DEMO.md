# Vaultex — ~7 minute demo script

**Audience:** marker, sponsor, or classmates.  
**Prereqs:** `npm install`, `npm run dev`, optional `anvil` on port **8545** for chain watcher (app still runs without it).

## Slide outline (optional 4–5 slides)

1. **Title** — Vaultex: transparent routing for charitable giving (capstone).
2. **Problem** — Donors want confidence; beneficiaries deserve dignity; spreadsheets are not enough.
3. **Approach** — Web app + SQLite ledger + local chain (Anvil) for dev realism.
4. **Live** — Screenshots or live browser (next section).
5. **Limits & next** — Local chain; masking improvements; beneficiary stories (roadmap).

**Speaker split (suggestion):** Sukhan opens (1–2); Haha drives UI (3–4); Tasin answers API/chain questions (Q&A).

---

## Minute-by-minute (live)

| Time | Action | Screen / notes |
|------|--------|----------------|
| 0:00 | “Stack in one sentence: React + Express + SQLite + optional Anvil.” | Terminal shows `npm run dev` already running. |
| 0:45 | Open **http://localhost:5173** | Homepage. |
| 1:15 | **Causes** — show list and open one cause | `/causes`, `/causes/:id`. |
| 2:00 | **Register** or **Login** with seeded account | Use `admin@vaultex.local` / `demo123` (see root README). |
| 2:45 | **Donate** flow (donor) or explain **Admin** path if demo as admin | `/donate` or admin disburse narrative. |
| 3:45 | **Ledger** — public activity, masked addresses | `/ledger` — point out `…` masking. |
| 4:30 | **Account** — balance / history for logged-in user | `/account`. |
| 5:15 | **Admin users** (if logged in as admin) | `/admin/users` — emphasize role gate. |
| 6:00 | **Honest limitations** — local Anvil; not production compliance; privacy doc in `docs/PRIVACY.md`. | — |
| 6:45 | Q&A | Tasin: API routes under `/api`; Sukhan: `docs/ARCHITECTURE.md`. |

---

## Backup if chain is offline

- Still demo: causes, login, ledger (from DB), account page.
- Say: “Watcher connects when Anvil is on **8545**; today we’re showing app-led flows.”

---

## Seeded credentials (capstone only)

Password for all seeded users: **`demo123`**. Emails in root **README.md**.

---

## After demo

- Note one **follow-up** you would ship first (e.g. tx journey page, stricter masking on public JSON).
