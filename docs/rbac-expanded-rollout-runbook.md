# RBAC Expanded Roles Rollout Runbook

**Owner:** Security / Platform  
**Flag:** `RBAC_EXPANDED_ROLES_ENABLED=true`

---

## Prerequisites

- Migration `20260617180000_rbac_expanded_roles` applied
- Forwarder user accounts created with `FORWARDER` role
- `require-permission` tests green

```bash
yarn workspace @dmx/backend vitest run require-permission
```

---

## Enablement

```bash
RBAC_EXPANDED_ROLES_ENABLED=true
# restart backend
```

---

## Role matrix (summary)

| Role | Key permissions |
|------|-----------------|
| SUPER_ADMIN / ADMIN | All |
| OPS_MANAGER | order/shipment ops, control tower |
| LOGISTICS_OPERATOR | shipment milestones |
| FINANCE_OPERATOR | payment read/manage |
| DOCUMENT_CONTROLLER | document approve |
| FORWARDER | shipment read, forwarder submit |
| BUYER / SUPPLIER | legacy buyer/supplier flows |

---

## Forwarder portal

Routes: `/api/forwarder/shipments`, `/api/forwarder/shipments/:id/milestones`

When flag **off:** ADMIN only (legacy)  
When flag **on:** `shipment:forwarder_submit` permission (FORWARDER role)

---

## Validation

- Forwarder user sees only participant shipments
- Unauthorized trade/payment routes return 403
- ADMIN regression E2E pass

---

## Rollback

```bash
RBAC_EXPANDED_ROLES_ENABLED=false
```

Effect: legacy `requireRole("ADMIN")` behaviour via `requirePermissionOrLegacyAdmin`.

---

## User migration

1. Identify forwarder users → assign `FORWARDER` role
2. Finance team → `FINANCE_OPERATOR`
3. Keep existing `ADMIN` users until roles verified

---

## Known risks

- Enabling before user assignment → 403 for forwarder portal
- Prisma enum must include new roles before assigning in DB
