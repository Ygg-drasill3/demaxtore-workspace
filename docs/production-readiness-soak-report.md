# Production Readiness — Soak Report

**Phase:** P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7  
**Environment:** staging | production  
**Flag(s) enabled:**  
**Soak start:**  
**Soak end:**  
**Owner:**  
**Rollback tested:** yes | no

---

## Metrics

| Metric | Start | End | Notes |
|--------|-------|-----|-------|
| Order count | | | |
| Shipment count | | | |
| Transition count | | | |
| Webhook count | | | |
| Failed webhook count | | | |
| Duplicate processed_event count | | | |
| Orchestrator recommendation count | | | |
| Shadow mismatch count | | | |
| Exception count | | | |
| Payment hold count | | | |
| Carrier event — timeline_only | | | |
| Carrier event — review | | | |
| Carrier event — applied | | | |
| API 4xx rate | | | |
| API 5xx rate | | | |
| Frontend error count | | | |

---

## Commands used

```bash
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
npx tsx apps/backend/scripts/shadow-parity-report.mjs
./scripts/staging-baseline.sh
```

---

## Incidents / anomalies

_Document any mismatches, false alerts, or rollbacks during soak._

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Platform | | | |
| Ops | | | |
