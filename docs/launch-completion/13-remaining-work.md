# Remaining Work

**Date:** 2026-06-17  
**Post completion program**

---

## Critical (code)

**NO CRITICAL REMAINING WORK**

Payment IDOR, carrier eventId replay, milestone kind mismatch, and exception type alignment are implemented and tested.

---

## Critical (ops — before production NODE_ENV)

| Item | Owner | Blocker for |
|------|-------|-------------|
| Set `PAYMENT_WEBHOOK_SECRET` + `CARRIER_WEBHOOK_SECRET` | Ops | Production webhook HMAC |
| Schedule `scripts/backup-cron.example.sh` | Ops | DR |
| Complete restore drill with superuser DB | Ops | DR proof |
| Fix `production-p0-validate.sh` JSON parse gate | Eng (1-line) | False FAIL on desync check |

---

## High

| Item | When |
|------|------|
| 7-day shadow soak with orchestrator shadow ON | Before P2 AUTO_APPLY |
| Remediate documented desync pair | Before P2 AUTO_APPLY |
| Seed 121 payment plans before P4 | Before `PAYMENT_GATES_ENABLED` |
| Global + Redis rate limits | Multi-instance / 500 scale |
| Document Center SQL pagination | ~100+ heavy doc users |
| External log aggregation + 5xx alert | Launch week 1 |
| Forwarder user migration | Before P7 |

---

## Medium

| Item | When |
|------|------|
| Onboarding guidance IDOR | Soon |
| Multi-shipment audit blind spot | P2 |
| Incoterms ORDER vs SHIPMENT doc scope | P5 |
| E2E flag-path coverage per P-step | Each rollout |
| `production-p0-validate.sh` HEALTH_URL for staging URL | Ops |

---

## Low

| Item | When |
|------|------|
| `.env.example` completeness | Next deploy |
| docs/ops folder drift | Ongoing |
| CommodityBid list pagination bug | When CB scales |

---

## Flag phase summary

| Phase | Status |
|-------|--------|
| P0 (flags OFF) | **Minor risks remain** — ops secrets + backup |
| P1 shadow | **Incomplete** — 1/7 days |
| P2 auto-apply | **NOT READY** |
| P4 payment gates | **BLOCKED** — seed required |
| P6 carrier auto | **BLOCKED** — needs P2 |
| P7 RBAC expanded | **BLOCKED** — no expanded-role users |
