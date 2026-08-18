# Shadow Soak — Days 2–7 (Pending)

**Status:** **NOT EXECUTED** — requires 6 additional calendar days with shadow flags enabled on staging.

---

## Required staging configuration

```bash
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_SHADOW_MODE=true
FSM_ORCHESTRATOR_AUTO_APPLY=false
# restart backend after .env change
```

## Daily command

```bash
./scripts/p1-shadow-soak-daily.sh
```

## Per-day checklist

| Day | Date | Executed | Artifact |
|-----|------|----------|----------|
| 2 | _pending_ | ☐ | `.data/shadow-soak/YYYYMMDD.md` |
| 3 | _pending_ | ☐ | |
| 4 | _pending_ | ☐ | |
| 5 | _pending_ | ☐ | |
| 6 | _pending_ | ☐ | |
| 7 | _pending_ | ☐ | |

## Acceptance criteria (per plan)

- `mirrorMismatches` stable at 0 across days
- `undocumentedDesyncCount` remains 0
- No growth in `duplicateProcessedEventGroups`
- Recommendation quality reviewed in shadow mode recs

**Reference baseline:** Day 1 report [`03-shadow-day-1.md`](03-shadow-day-1.md)
