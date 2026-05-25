# Vaultex — privacy and transparency model

**Last updated:** May 2026.

This document describes how the **current** Vaultex codebase treats identity and data. It is not legal advice; align with your course or institution if you need a formal privacy policy.

## Roles

- **Public (not logged in):** Can browse causes, ledger-style activity, and some config-style summaries. Must not be used to deanonymize individuals beyond what the API returns.
- **Donor / beneficiary (logged in):** Sees their own account details where the API includes them (including wallet address for *their* linked Anvil index where implemented).
- **Admin:** Can list users and perform disbursements; APIs may expose more detail for operational tasks. Treat admin accounts as highly privileged.

## Masking rule (addresses)

The backend uses `maskAddr()` in `backend/server/resolve.ts`: for typical `0x` addresses it shows **`0x` + first 6 hex chars + `…` + last 4 hex chars** (lowercased internally for comparison).

Ledger API responses include **both** `fromMasked` / `toMasked` and human-readable `fromName` / `toName` when labels exist (e.g. “Vaultex”, seeded user names). Raw `from` / `to` may still appear in payloads for some routes—**treat the product as “improving”;** a hard “never leak raw on public routes” pass is a recommended follow-up (see task tracker).

## Endpoints to be aware of

- **`GET /api/config`** exposes `superRichAddress` (full vault routing address) for transparency demos. If you need that masked for anonymous viewers, change the API contract and UI together.
- **`GET /api/auth/me`** (authenticated) may include `address` and `addressMasked` for the current user so they can recognize their own wallet in dev.

## Data stored locally

- **SQLite** (`backend/server/data/` by default): users (email, password hash, role, optional `anvil_index`), causes, ledger rows, sessions via signed cookies—not server-side session DB.

## Chain data

- With **Anvil** (local), “on-chain” activity is visible to anyone with RPC access to that node. That is **not** public internet privacy; it is **local dev transparency**.
- Do not claim “anonymous on Ethereum” unless you have a specific design (mixers, L2 privacy, etc.)—Vaultex does not provide that today.

## Homepage beneficiary stories (carousel)

The **home page** (`/`) shows a rotating carousel with beneficiary quotes and impact stats (War relief, Medical support, Education, LGBTQ+ safe space). Today this content is **curated in frontend code**, not loaded per-user from the API.

If you extend or productionize stories:

- Obtain **clear consent** for anything shown publicly.
- Avoid sensationalizing harm; prefer agency-focused language.
- Separate **internal ops** data from **public marketing** content.
- Do not imply live ledger rows are tied 1:1 to carousel text unless the backend enforces that link.

## Retention

Capstone default: data persists in SQLite until deleted. For a fresh seed, stop the server and remove the DB files documented in the root README (only on non-production machines you control).
