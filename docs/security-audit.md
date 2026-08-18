# DeMaxtore Security Audit

**Date:** 2026-06-03  
**Method:** Static review of `apps/backend/src`, Prisma migrations, `apps/frontend/src/lib/socket.ts`.

---

## Summary

| Domain | Result |
|--------|--------|
| Authentication | **PASS** |
| Authorization (RBAC + workspace) | **PASS** / **WARN** |
| Cross-tenant isolation | **WARN** |
| Attachments | **PASS** |
| Socket security | **WARN** / **FAIL** (subscribe ACL) |
| Abuse resistance | **FAIL** |
| Audit integrity | **WARN** |

---

## Authentication

| Control | Result | Evidence |
|---------|--------|----------|
| JWT access validation | **PASS** | `jwt.ts` — HS256, `type === "access"`; `middleware/auth.ts` `requireAuth` |
| Refresh token rotation | **PASS** | `auth.service.ts` — revoke old, issue new; reuse revokes all sessions |
| Refresh storage | **PASS** | SHA-256 hash in DB; HttpOnly cookie `dmx_refresh`, `sameSite: lax`, `secure` in prod |
| Password reset | **PASS** | No enumeration on forgot; token hashed; reset revokes refresh tokens |
| JWT secret strength | **PASS** | `env.ts` — min 32 chars |
| Login brute-force | **WARN** | `bruteforce.ts` — 5 attempts / 15 min, **in-memory** (single instance) |
| Forgot/reset rate limit | **WARN** | No throttle on `/forgot-password`, `/reset-password` |

---

## RBAC

| Control | Result | Evidence |
|---------|--------|----------|
| `requireRole` on RFQ mutations | **PASS** | `rfq.routes.ts` per-action roles |
| `requireRole` on CommodityBid | **PASS** | `commoditybid.routes.ts` |
| Order/Shipment routes | **WARN** | `requireAuth` only; FSM `allowedRoles` in services |
| Workspace policies | **PASS** | `canAccessRfq`, `canAccessCommodityBid`, `canAccessOrder`, `canAccessShipment` |
| Admin bypass | **PASS** (by design) | All policies return true for `ADMIN` |
| Quotations | **PASS** | `SUPPLIER` + `canAccessRfq` in `quotations.service.ts` |
| Clarifications route | **WARN** | `requireAuth` only; FSM enforces `post_clarification` role |

---

## Cross-Tenant Isolation

| Control | Result | Evidence |
|---------|--------|----------|
| Buyer A cannot see Buyer B RFQ | **PASS** | `03-realtime-and-isolation.spec.ts`; participant + owner checks |
| Supplier sees only assigned RFQs (HTTP) | **PASS** | `rfq.policy.ts` — assignment + `SUPPLIER_VISIBLE_STATES` |
| Workspace participant gate | **PASS** | Order/Shipment/CB policies check `workspaceParticipant` |
| Organisation as tenant | **WARN** | `organisationId` on `User` unused in access policies — isolation is per-workspace, not per-org |
| CommodityBid sealed bids | **PASS** | RLS migration `20260603140000_sprint3a1_commoditybid_rls`; `withRlsUser` on comparison reads |
| RLS on other tables | **FAIL** | RFQ quotations, workspaces — app-layer only |

---

## Attachment Permissions

| Control | Result | Evidence |
|---------|--------|----------|
| RFQ upload/download | **PASS** | `attachments.service.ts` — `canAccessRfq`, MIME allowlist, 25MB |
| Order documents | **PASS** | `order.documents.routes.ts` — `canAccessOrder` |
| Shipment documents | **PASS** | `shipment.documents.routes.ts` — `canAccessShipment` |
| Path traversal | **PASS** | Storage keys UUID-based under `STORAGE_DIR` |

---

## Socket Authorization

| Control | Result | Evidence |
|---------|--------|----------|
| Handshake JWT | **PASS** | `realtime/socket.ts` — `verifyAccessToken` on connect |
| Workspace subscribe ACL | **FAIL** | Subscribe calls **`canAccessRfq` only** (`socket.ts` L64–68). Supplier on Order (`ORDER_CREATED`, `FREIGHT_REQUESTED`, …) or CommodityBid (`BID_OPEN`, …) fails `SUPPLIER_VISIBLE_STATES` (RFQ states only). HTTP may allow access while socket subscribe returns FORBIDDEN. |
| Room join after ACL | **PASS** | `workspace:{id}` only after ack ok |
| Auto role/user rooms | **PASS** | `user:{id}`, `role:{role}` on connect |

---

## Abuse Resistance

| Control | Result | Evidence |
|---------|--------|----------|
| Global API rate limiting | **FAIL** | No `express-rate-limit` in `app.ts` / `routes.ts` |
| CSRF | **FAIL** | No CSRF middleware; refresh cookie + state-changing POSTs |
| Helmet / CORS | **PASS** | `app.ts` |
| Idempotency key binding | **PASS** | `idempotency.ts` — user + route scoped |
| Sensitive data in logs | **WARN** | Pino structured; no automated secret scan in repo |

---

## Audit Tamper Resistance

| Control | Result | Evidence |
|---------|--------|----------|
| App-layer append-only | **PASS** | Services use `auditLog.create` only; no updates in `src` |
| FSM authorised flag | **PASS** | `SET LOCAL app.fsm_authorised = 'true'` in RFQ/CB/Order/Shipment `applyTransition` |
| DB trigger + REVOKE | **WARN** | Defined in `prisma/migrations/state-guard-trigger.sql` — **not** in numbered migrations; requires manual `psql -f` per `integration-hardening-phase-b-report.md` |
| Superuser bypass | **WARN** | Effectiveness depends on DB role in `DATABASE_URL` |

---

## RLS Policies

| Table | Result | Evidence |
|-------|--------|----------|
| `commoditybid_submissions` | **PASS** | Migration `20260603140000_sprint3a1_commoditybid_rls` |
| Other tables | **FAIL** | Placeholder comment in `state-guard-trigger.sql` only |

---

## Admin Escalation

| Path | Result | Evidence |
|------|--------|----------|
| ADMIN full workspace access | **PASS** | All `canAccess*` policies |
| ADMIN RFQ actions | **PASS** | `requireRole("ADMIN")` on assign/publish/reject |
| Supplier cannot invoke buyer actions | **PASS** | FSM `allowedRoles` + 403 in services |

---

## Sensitive Data Exposure

| Area | Result | Notes |
|------|--------|-------|
| Password hashes | **PASS** | bcrypt in schema; not returned in APIs |
| Tokens in responses | **PASS** | Access token in body; refresh in HttpOnly cookie |
| Error messages | **WARN** | Structured `AppError`; no field-level audit of all 500 responses |

---

## Security Audit Verdict

**Overall: WARN** (pilot viable with manual state-guard deploy and awareness of socket ACL defect).

**Must fix before broad production:** P0 socket subscribe ACL, migrate state-guard into deployment pipeline, API rate limits on auth endpoints at minimum.
