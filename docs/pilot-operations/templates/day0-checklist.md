# DeMaxtore Turkey Paid Pilot — Day-0 Checklist

**Use:** Run once, same day, immediately before Customer #1 onboarding.  
**Full playbook:** [`../../turkey-paid-pilot-day0-customer1-operations-playbook.md`](../../turkey-paid-pilot-day0-customer1-operations-playbook.md)  
**Launch gate:** [`../../turkey-mvp-final-launch-go-no-go.md`](../../turkey-mvp-final-launch-go-no-go.md)

| Field | Value |
|-------|-------|
| Date | |
| Operator | |
| Customer (if named) | |
| Result | ☐ GO · ☐ STOP |

---

## Production

| # | Check | PASS | FAIL | Notes |
|---|-------|:----:|:----:|-------|
| 1 | `/api/healthz` | ☐ | ☐ | |
| 2 | `/api/ready` | ☐ | ☐ | |
| 3 | DB up (`ready.checks.db`) | ☐ | ☐ | |
| 4 | Redis up | ☐ | ☐ | |
| 5 | Storage up | ☐ | ☐ | |
| 6 | Backend service active | ☐ | ☐ | |
| 7 | Frontend reachable | ☐ | ☐ | |
| 8 | Buyer login smoke | ☐ | ☐ | |
| 9 | Broker login smoke | ☐ | ☐ | |
| 10 | Trucker login smoke | ☐ | ☐ | |

---

## Backup

| # | Check | PASS | FAIL | Notes |
|---|-------|:----:|:----:|-------|
| 11 | Latest **complete** backup SUCCESS | ☐ | ☐ | ID: |
| 12 | DB artifact present | ☐ | ☐ | |
| 13 | Upload artifact present | ☐ | ☐ | |
| 14 | Backup age **< 26 hours** | ☐ | ☐ | Completed at: |
| 15 | `backup-status.sh` → FRESH | ☐ | ☐ | |
| 16 | Latest set **not partial** | ☐ | ☐ | |
| 17 | No unresolved backup failure (prod) | ☐ | ☐ | |

Command: `./scripts/backup-status.sh`

---

## Security

| # | Check | PASS | FAIL | Notes |
|---|-------|:----:|:----:|-------|
| 18 | Open P0 = 0 | ☐ | ☐ | |
| 19 | No known tenant-isolation regression | ☐ | ☐ | |
| 20 | Production E2E/test routes closed | ☐ | ☐ | |
| 21 | Rate-limit / credential protections active | ☐ | ☐ | |

---

## Customer #1 readiness

| # | Check | PASS | FAIL | Notes |
|---|-------|:----:|:----:|-------|
| 22 | Buyer account ready | ☐ | ☐ | |
| 23 | Customs Broker account ready | ☐ | ☐ | |
| 24 | Trucker account ready | ☐ | ☐ | |
| 25 | Broker assignment workflow understood | ☐ | ☐ | |
| 26 | Trucker assignment workflow understood | ☐ | ☐ | |
| 27 | Supplier info collected | ☐ | ☐ | |
| 28 | Product/SKU info collected | ☐ | ☐ | |
| 29 | Delivery warehouse info collected | ☐ | ☐ | |
| 30 | Pilot limitations explained to customer | ☐ | ☐ | |
| 31 | DeMaxtore Ops owner assigned | ☐ | ☐ | Name: |
| 32 | Customer support channel assigned | ☐ | ☐ | |

---

## STOP — do not onboard if any checked

| Stop condition | Yes → STOP |
|----------------|:----------:|
| Backup > 26h stale | ☐ |
| Two consecutive unattended backup failures | ☐ |
| DB / Redis / storage readiness fail | ☐ |
| Cross-tenant or security incident | ☐ |
| Internal margin exposure | ☐ |
| Any open P0 | ☐ |

---

## Sign-off

| Role | Name | Signature / date |
|------|------|------------------|
| DeMaxtore Ops lead | | |
| Launch authority (if separate) | | |

**If STOP:** record reason, do not onboard Customer #1 until cleared.
