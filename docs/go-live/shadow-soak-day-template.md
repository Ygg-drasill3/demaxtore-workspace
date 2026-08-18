# Shadow Soak — Day Report Template

Copy to `docs/go-live/shadow-day-N.md` for each day.

---

# Shadow Soak — Day N

**Date:** YYYY-MM-DD  
**Operator:**  
**Flags:** `FSM_ORCHESTRATOR_ENABLED=true`, `SHADOW_MODE=true`, `AUTO_APPLY=false`

---

## Metrics

| Metric | Value | Delta vs Day N-1 |
|--------|------:|------------------|
| Recommendations (sampled) | | |
| Shadow mode | | |
| Applied mode | | |
| Mirror mismatches | | |
| Matched shadow mirrors | | |
| Desync pairs | | |
| Undocumented desync | | |
| Duplicate processed_event groups | | |
| Exceptions (7d window) | | |
| Payment timeline events (7d) | | |
| Carrier event records | | |

---

## Mismatch log

_None / list recommendation IDs with root cause_

---

## Incidents

_None / describe_

---

## Operator sign-off

- [ ] Snapshot saved to `.data/shadow-soak/YYYYMMDD.json`
- [ ] Desync audit run
- [ ] No new undocumented desync

**Status:** PASS / FAIL / PENDING
