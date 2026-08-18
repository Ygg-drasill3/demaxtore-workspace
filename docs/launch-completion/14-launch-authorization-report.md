# Launch Authorization Report

**Date:** 2026-06-17  
**Authorization level:** P0 pilot — flags OFF, controlled first customers  
**Verdict basis:** [`12-final-verdict.md`](12-final-verdict.md) — **READY WITH MINOR RISKS**

---

## Authorized scope

| In scope | Out of scope |
|----------|--------------|
| P0 pilot &lt;50 active trades | P2–P7 flag enablement |
| Manual order/shipment logistics | AUTO_APPLY orchestrator |
| Staging → production with flags OFF | Enterprise 500+ scale |
| First 10 revenue customers | Payment gates (P4) without seed |

---

## Accepted risks

1. **Webhook secrets** — must be set before accepting live payment/carrier webhooks (currently missing on staging `.env`)
2. **Manual backup** — cron not yet scheduled; weekly manual `pg_dump` until automated
3. **No external APM** — in-app Control Tower + daily audit scripts only
4. **1 documented desync** — CT may show false positive until remediated before P2
5. **7-day shadow soak incomplete** — acceptable for P0; required before P2

---

## Rollback plan

```bash
# Immediate (< 5 min)
FSM_ORCHESTRATOR_ENABLED=false
FSM_ORCHESTRATOR_AUTO_APPLY=false
PAYMENT_GATES_ENABLED=false
CARRIER_AUTO_TRANSITION_ENABLED=false
EXCEPTION_ENGINE_V2_ENABLED=false
RBAC_EXPANDED_ROLES_ENABLED=false
# pm2 restart ecosystem.config.cjs

# Verify
./scripts/staging-baseline.sh
```

Schema is additive — rollback is flag-only. See [`production-readiness-rollout-runbook.md`](../production-readiness-rollout-runbook.md).

---

## Pre-launch checklist (must complete)

- [ ] Set `PAYMENT_WEBHOOK_SECRET` and `CARRIER_WEBHOOK_SECRET` in production `.env`
- [ ] `npx prisma migrate deploy` on prod
- [ ] Schedule `scripts/backup-cron.example.sh`
- [ ] Configure uptime monitor on `/api/healthz` and `/api/ready`
- [ ] Run `./scripts/production-p0-validate.sh` (after webhook secrets set)
- [ ] E2E smoke: `05-order-flow`, `06-shipment-flow`, `39-production-hardening`

---

## First 30 days

| Day | Action |
|-----|--------|
| Daily | `fsm-migration-audit.mjs --verbose` |
| Daily | Error log review (Pino level ≥50) |
| Daily | Backup record in System Operations |
| Week 1 | Complete restore drill with superuser |
| Days 1–7 | `./scripts/p1-shadow-soak-daily.sh` with shadow flags ON |
| Day 15–30 | Fill [`production-readiness-soak-report.md`](../production-readiness-soak-report.md) |

See [`ops-monitoring-minimum.md`](../ops-monitoring-minimum.md).

---

## First customer checklist

- [ ] Buyer + supplier accounts seeded with correct `organisationId`
- [ ] Participant rows on RFQ/order workspaces
- [ ] Email provider configured (`RESEND` or SMTP)
- [ ] `CORS_ORIGIN` and `APP_BASE_URL` match production domain
- [ ] Support runbook for Exception Hub triage

---

## First shipment checklist

- [ ] Shipment spawned from order (`spawnedFromId`)
- [ ] Trade documents uploaded per incoterms
- [ ] Manual shipment milestones (P0 — no carrier auto)
- [ ] Verify order/shipment states align (no new undocumented desync)

---

## First payment checklist

- [ ] Payment intent created via `/api/payments/orders/:orderId/intents` (participant ACL enforced)
- [ ] `PAYMENT_WEBHOOK_SECRET` set; HMAC enforced
- [ ] Webhook includes stable `eventId`
- [ ] Do **not** enable `PAYMENT_GATES_ENABLED` until plans seeded

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform / Eng | _pending_ | | |
| Ops | _pending_ | | |
| Product | _pending_ | | |

**Technical authorization:** Conditional go for **P0 pilot** upon completion of pre-launch checklist above.
