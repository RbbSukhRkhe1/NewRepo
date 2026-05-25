# Vaultex — comparative notes (capstone)

**Last updated:** May 2026.

Short positioning vs common patterns. **Not exhaustive**; add your own sources for the final report and presentation (see [PRESENTATION_SLIDES.md](./PRESENTATION_SLIDES.md)).

## 1. Traditional charity platforms (web + payment processor)

**Examples (illustrative):** Many national giving sites focus on **trust via brand + audited financials**, not per-donation chain traceability.

| Dimension | Typical platform | Vaultex (this repo) |
|-----------|------------------|---------------------|
| Transparency unit | Annual reports, impact pages | Per-row ledger + narratives + optional chain sync in dev |
| Storytelling | Marketing pages, annual impact PDFs | Homepage carousel + **Impact** fulfilled campaigns |
| Privacy | Account-based; internal PII controls | Masked addresses in UI; dev keys are public-by-design on Anvil |
| Crypto | Rarely core | Local chain for capstone realism |

**Takeaway:** Vaultex is optimized for **teaching verifiable flows**, not replacing a full payment compliance stack.

## 2. Pure “crypto donation” dApps

Many emphasize wallet connect + on-chain only.

| Dimension | Pure on-chain dApp | Vaultex |
|-----------|-------------------|---------|
| UX | Wallet-centric | Email/password session + server-assisted flows |
| Data | Chain is source of truth | SQLite + chain enrichment |
| Demo stability | Network-dependent | Works with local Anvil + seed |

**Takeaway:** Hybrid model trades maximal decentralization for **demo reliability** and **familiar auth**.

## 3. Academic / standards framing (optional citations)

- **Aid transparency:** search open literature on “aid transparency” + “donor tracking” for governance language.
- **Privacy on public ledgers:** Ethereum public mempool / address linkage is well documented—cite if you discuss limits of “anonymous donation” on L1.

## Suggested reading direction for HD write-ups

1. One **NGO transparency** source (report or standard).  
2. One **blockchain privacy limitations** source.  
3. One **human-centered design for vulnerable populations** source (beneficiary dignity).

Fill in concrete URLs/DOIs in your final bibliography; this file is intentionally lightweight.
