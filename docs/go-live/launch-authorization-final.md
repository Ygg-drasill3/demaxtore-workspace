# Launch Authorization — Final

**Date:** 2026-06-17  
**Authorization:** **APPROVED — P0 Production Launch**  
**Basis:** [`final-production-verdict.md`](final-production-verdict.md) — PRODUCTION READY

---

## Launch date recommendation

| Milestone | Recommended date |
|-----------|------------------|
| Production deploy (flags OFF) | **2026-06-18** (next business day after final validation) |
| P1 shadow soak start | 2026-06-18 (parallel, non-blocking) |
| First customer onboarding | 2026-06-19 – 2026-06-25 (week 1) |
| P2 evaluation earliest | 2026-06-26 (after 7-day shadow) |

---

## Rollout order

```
P0 Launch (flags OFF)
  → First customers (week 1)
  → P1 shadow soak (7 days, parallel)
  → P2 auto-apply (GO/NO-GO gate)
  → P3 exception v2
  → P4 payment gates (+ seed)
  → P5 incoterms
  → P6 carrier auto
  → P7 RBAC expanded
```

---

## Rollback strategy

| Trigger | Action | ETA |
|---------|--------|-----|
| 5xx spike | PM2 restart; if persists, previous release | &lt;15 min |
| Data corruption | Restore from `.data/backups/` + uploads tar | &lt;1 hr |
| Flag regression | All flags `false` + PM2 restart | &lt;5 min |
| Security incident | Rotate JWT + webhook secrets; revoke sessions | &lt;30 min |

Master rollback: [`production-launch-master-checklist.md`](production-launch-master-checklist.md)

---

## First customer checklist

- [ ] Buyer + supplier accounts with correct `organisationId`
- [ ] Workspace participants on RFQ/order
- [ ] Email provider live (`RESEND` or SMTP)
- [ ] `CORS_ORIGIN` + `APP_BASE_URL` = production domain
- [ ] Support contact for Exception Hub triage
- [ ] `./scripts/production-p0-validate.sh` PASS on production host

---

## First RFQ checklist

- [ ] Buyer submits RFQ with deadline
- [ ] Supplier receives notification
- [ ] Quote submitted and visible to buyer
- [ ] Supplier selection → order spawn
- [ ] Timeline events recorded

**E2E reference:** `tests/02-rfq-flow.spec.ts`, `tests/05-order-flow.spec.ts`

---

## First shipment checklist

- [ ] Shipment workspace spawned from order
- [ ] Trade documents per incoterms (manual upload)
- [ ] Shipment milestones advanced manually (P0 — no carrier auto)
- [ ] Order/shipment states aligned — run `fsm-migration-audit.mjs` after milestone
- [ ] No new undocumented desync

---

## First payment checklist

- [ ] Payment intent via `/api/payments/orders/:orderId/intents` (ACL enforced)
- [ ] Webhook uses stable `eventId` + HMAC signature
- [ ] `PAYMENT_GATES_ENABLED` remains **false** at P0
- [ ] Finance team aware: P4 seed required before gates

---

## Accepted risks (P0)

1. Documented desync pair — CT may alert until P2 remediate
2. External APM not yet deployed — ops uses health probes + daily audit
3. Document Center slow under heavy admin use — human triage
4. P1–P7 flags off — manual logistics path

---

## Sign-off

| Role | Status | Date |
|------|--------|------|
| Platform / Engineering | **Authorized** (automated validation) | 2026-06-17 |
| Operations | Pending human sign-off | |
| Product | Pending human sign-off | |

---

## Reference documents

| Document | Path |
|----------|------|
| Master checklist | [`production-launch-master-checklist.md`](production-launch-master-checklist.md) |
| Secrets | [`production-secrets-report.md`](production-secrets-report.md) |
| Backup | [`backup-operations-runbook.md`](backup-operations-runbook.md) |
| Restore | [`restore-drill-report.md`](restore-drill-report.md) |
| Monitoring | [`monitoring-deployment-plan.md`](monitoring-deployment-plan.md) |
| Launch Completion | [`../launch-completion/README.md`](../launch-completion/README.md) |

**Technical authorization: GRANTED for P0 production launch.**
