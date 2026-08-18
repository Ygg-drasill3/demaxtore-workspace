# Sprint 3.9 — Socket ACL Hardening Report

**Date:** 2026-06-03  
**P0:** Subscribe ACL used `canAccessRfq()` for all workspace types

---

## Change

| File | Change |
|------|--------|
| `apps/backend/src/modules/workspace/workspace.policy.ts` | `canAccessWorkspace()` routes by `WorkspaceType` |
| `apps/backend/src/realtime/socket.ts` | Subscribe uses `canAccessWorkspace` + handshake rate limit |

Routing:

| Type | Policy |
|------|--------|
| RFQ | `canAccessRfq` |
| COMMODITYBID | `canAccessCommodityBid` |
| ORDER | `canAccessOrder` |
| SHIPMENT | `canAccessShipment` |

---

## Validation

| Scenario | Role | Expected | Test |
|----------|------|----------|------|
| ORDER workspace | Supplier (participant) | PASS subscribe | E2E `07-hardening` + vitest `workspace-policy.test.ts` |
| Buyer1 RFQ | Buyer2 (non-participant) | FAIL `FORBIDDEN` | E2E `07-hardening` |
| Admin | Any workspace | PASS | Policy bypass |

```bash
yarn test src/hardening/workspace-policy.test.ts
npx playwright test tests/07-hardening.spec.ts
```

---

## P0 status

**CLOSED** — Workspace-type aware socket subscribe ACL deployed.
