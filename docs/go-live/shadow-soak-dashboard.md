# Shadow Soak Dashboard

**Program:** P1 — Orchestrator shadow mode  
**Owner:** Platform / Ops  
**Last updated:** 2026-06-17

---

## Required flags (staging `.env`)

```
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_SHADOW_MODE=true
FSM_ORCHESTRATOR_AUTO_APPLY=false
```

Restart backend after change: `pm2 restart ecosystem.config.cjs`

---

## Daily command

```bash
./scripts/p1-shadow-soak-daily.sh
# → .data/shadow-soak/YYYYMMDD.md
# → .data/shadow-soak/YYYYMMDD.json
# → .data/shadow-soak/YYYYMMDD-desync.json
```

---

## Metrics tracker

| Day | Date | Recs | Shadow | Apply | Mismatches | Desync | Undoc | Dup events | Exc 7d | Pay events | Carrier recs | Artifact |
|-----|------|-----:|-------:|------:|-----------:|-------:|------:|-----------:|-------:|-----------:|-------------:|----------|
| 1 | 2026-06-17 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 175 | 11 | 0 | [`.data/shadow-soak/20260617.json`](../../.data/shadow-soak/20260617.json) |
| 2 | _pending_ | | | | | | | | | | | |
| 3 | _pending_ | | | | | | | | | | | |
| 4 | _pending_ | | | | | | | | | | | |
| 5 | _pending_ | | | | | | | | | | | |
| 6 | _pending_ | | | | | | | | | | | |
| 7 | _pending_ | | | | | | | | | | | |

**Note:** Day 1 taken with orchestrator flags OFF (P0 state). Days 2–7 require shadow flags ON + live traffic.

---

## SQL supplements (run daily)

```sql
-- Payment timeline (7d)
SELECT COUNT(*) FROM timeline_events
WHERE event_type LIKE 'payment%' AND created_at >= NOW() - interval '7 days';

-- Carrier events by status
SELECT status, confidence, COUNT(*) FROM carrier_event_records GROUP BY 1,2;

-- Duplicate processed events
SELECT source, event_id, COUNT(*) FROM processed_events
GROUP BY 1,2 HAVING COUNT(*) > 1;
```

---

## Acceptance gates (Day 7)

| Gate | Threshold |
|------|-----------|
| `mirrorMismatches` | 0 (or all explained in day report) |
| `undocumentedDesyncCount` | 0 |
| `duplicateProcessedEventGroups` | 0 |
| New desync vs Day 1 | 0 undocumented |

---

## Rollback test (once during soak)

1. `FSM_ORCHESTRATOR_ENABLED=false` + restart
2. `./scripts/staging-baseline.sh`
3. Confirm order logistics UI + shipment E2E

---

## Day report template

See [`shadow-soak-day-template.md`](shadow-soak-day-template.md).

---

## Final sign-off

After Day 7 → [`auto-apply-readiness-report.md`](auto-apply-readiness-report.md)
