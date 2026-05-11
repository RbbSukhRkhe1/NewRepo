# ADR-0002: Session strategy — HTTP-only cookies vs JWT at the gateway

| Field | Value |
|-------|--------|
| **Status** | Proposed |
| **Date** | 2026-05-07 |
| **Context** | **Today:** the SPA talks to one origin in dev (Vite proxy) or one API origin in prod; the server uses **`cookie-session`** (signed, HTTP-only cookie) storing **`userId`**. Browsers send the cookie automatically on `fetch(..., { credentials: 'include' })`. **Target:** an **API Gateway** in front of multiple services must decide how **identity** crosses process boundaries: continue **opaque server-side sessions** vs issue **JWTs** (or signed session tickets) for downstream services. |
| **Decision (proposed)** | **Phase A (short term):** keep **cookie-based sessions** terminating at the **gateway** (or BFF). The gateway validates the session and forwards **internal** calls with a **service identity** (mTLS or HMAC headers) plus **user context** (`X-User-Id`, `X-User-Role`) only on the **private network**. **Phase B (optional):** issue **short-lived JWT access tokens** + refresh for SPA if third-party clients or mobile appear; services validate JWT signature with a **shared JWKS** or introspection endpoint. **Explicit non-goal for capstone MVP:** storing long-lived JWTs in `localStorage` without rotation. |
| **Alternatives considered** | **(1) JWT-only in Authorization header:** simple for services, but easy to mishandle storage/XSS; requires refresh story. **(2) Session sticky to monolith forever:** blocks strangler. **(3) OAuth2/OIDC full stack:** heavy for course timeline unless mandated. |
| **Consequences** | Cookie path keeps **current frontend** unchanged longest. JWT path requires **gateway minting**, **clock skew**, and **revocation** story. Either way, document **CORS** and **`SameSite`** when SPA and API are on different sites. |

## Current implementation pointer

- `backend/server/app.ts` — `cookie-session`, `SESSION_SECRET`, `sameSite: 'lax'`.

## Links

- ADR-0001 strangler ordering affects **when** auth is extracted.
- Privacy: [../PRIVACY.md](../PRIVACY.md)
