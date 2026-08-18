# RBAC Rollout Checklist

**Date:** 2026-06-17  
**Flag:** `RBAC_EXPANDED_ROLES_ENABLED=true` (P7)  
**P0 launch:** Flag remains **OFF**

---

## Migration

- [x] `20260617180000_rbac_expanded_roles` applied
- [x] Prisma `Role` enum includes expanded roles
- [x] `require-permission` tests pass (4/4)

---

## User inventory (staging — 2026-06-17)

| Role | Count | P7 required |
|------|------:|:-----------:|
| BUYER | 4 | Existing |
| SUPPLIER | 9 | Existing |
| ADMIN | 2 | Existing |
| SUPER_ADMIN | 0 | Optional |
| OPS_MANAGER | 0 | **Missing** |
| LOGISTICS_OPERATOR | 0 | **Missing** |
| FINANCE_OPERATOR | 0 | **Missing** |
| DOCUMENT_CONTROLLER | 0 | **Missing** |
| FORWARDER | 0 | **Missing** |

---

## Pre-P7 user creation checklist

- [ ] Create at least 1 `FORWARDER` user (forwarder portal smoke test)
- [ ] Create 1 `OPS_MANAGER` for control tower ops
- [ ] Create 1 `FINANCE_OPERATOR` for payment read/manage
- [ ] Create 1 `DOCUMENT_CONTROLLER` for doc approval
- [ ] Map existing ADMIN users — retain ADMIN or SUPER_ADMIN
- [ ] Verify JWT carries correct `role` after login

---

## Enablement steps

```bash
# 1. Users created and verified
# 2. Staging smoke:
yarn workspace @dmx/backend vitest run require-permission
yarn workspace @dmx/e2e test tests/39-production-hardening.spec.ts

# 3. Enable
RBAC_EXPANDED_ROLES_ENABLED=true
pm2 restart ecosystem.config.cjs
```

---

## Validation

- [ ] Forwarder sees only participant shipments (`/api/forwarder/shipments`)
- [ ] BUYER cannot access admin routes (403)
- [ ] FINANCE_OPERATOR can read payment routes
- [ ] ADMIN regression E2E green

---

## Rollback

```bash
RBAC_EXPANDED_ROLES_ENABLED=false
pm2 restart ecosystem.config.cjs
```

---

## P0 launch

**No action required** — legacy `requireRole("ADMIN")` remains active. RBAC expanded is **post-launch P7**.

See [`rbac-expanded-rollout-runbook.md`](../rbac-expanded-rollout-runbook.md).
