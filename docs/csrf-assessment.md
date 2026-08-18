# Sprint 3.9 — CSRF Assessment

**Date:** 2026-06-03  
**Phase 4:** Code review before implementation

---

## Architecture summary

| Mechanism | Usage |
|-----------|--------|
| API mutations | `Authorization: Bearer <access JWT>` (header) |
| Refresh session | HttpOnly cookie `dmx_refresh`, `sameSite: lax`, `path: /api/auth` |
| CORS | Whitelist origins, `credentials: true` |
| Socket | JWT in `auth.token` or Bearer header |

---

## CSRF risk analysis

### State-changing API calls with Bearer token

**Risk: LOW**

Browsers do not attach custom `Authorization` headers on cross-origin form posts from attacker sites. Mutations require explicit JS from the SPA origin (or non-browser clients).

**Conclusion:** Classic CSRF against `/api/rfq/.../actions/*` with cookie-only auth does **not** apply — access token is not auto-sent cross-site.

### Refresh endpoint `POST /api/auth/refresh`

**Risk: LOW–MEDIUM (theoretical)**

Refresh uses a cookie. `sameSite: lax` blocks cross-site POST in modern browsers for most navigation attacks. Subdomain misconfiguration or future `sameSite: none` would increase risk.

**Conclusion:** Current cookie settings are adequate for pilot. No CSRF token required for refresh at this stage.

### Logout `POST /api/auth/refresh` sibling

**Risk: LOW** — nuisance logout only.

---

## Decision

**Do not implement CSRF middleware in Sprint 3.9.**

| Reason | Detail |
|--------|--------|
| Primary auth model | JWT Bearer on API, not cookie-session |
| Existing mitigations | `sameSite: lax`, CORS, Helmet |
| Audit scope | P1 “review”; no proven exploit path in current SPA |

---

## Production follow-up (documentation only)

If the product later moves to cookie-based access tokens or `sameSite: none`, re-evaluate double-submit token or `SameSite=Strict` refresh cookies.

---

## Phase 4 verdict

| Item | Result |
|------|--------|
| CSRF implementation | **Not required** (documented) |
| Deliverable | This assessment |
