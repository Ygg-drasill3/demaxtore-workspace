# Auto Apply Readiness Report (Go/No-Go)

**Date:** 2026-06-17  
**Phase:** P2 — `FSM_ORCHESTRATOR_AUTO_APPLY=true`  
**Decision:** **NO-GO** (pre-soak)

---

## Go/No-Go rules

| Rule | Condition | GO | NO-GO |
|------|-----------|----|-------|
| R1 | `mirrorMismatches === 0` over 7 days | Pass | Fail |
| R2 | All mismatches documented with root cause | Pass if R1 fails but explained | Fail if unexplained |
| R3 | `undocumentedDesyncCount === 0` | Pass | Fail |
| R4 | 7 consecutive daily snapshots with shadow ON | Pass | Fail |
| R5 | Documented desync remediated or cancelled | Pass | Fail |

**GO** when R1+R3+R4+R5 pass (or R2 satisfies R1 exceptions).  
**NO-GO** otherwise.

---

## Current evaluation

| Rule | Status | Evidence |
|------|--------|----------|
| R1 | **N/A** | 0 recommendations — shadow flags were OFF on Day 1 |
| R2 | N/A | No mismatches |
| R3 | **PASS** | `undocumentedDesyncCount: 0` |
| R4 | **FAIL** | 1/7 days; shadow not enabled on running backend |
| R5 | **FAIL** | `ORD-RFQ-2026-0055-78c8680d` still desynced (`blocksP2AutoApply`) |

---

## Decision matrix output

```
IF soak_days < 7          → NO-GO
IF undocumentedDesync > 0 → NO-GO
IF documented_desync_open → NO-GO (until remediated)
IF mirrorMismatches > 0 AND NOT all_explained → NO-GO
ELSE                      → GO
```

**Result:** **NO-GO**

---

## Remediation before re-evaluation

1. Enable shadow flags; complete Days 2–7 per [`shadow-soak-dashboard.md`](shadow-soak-dashboard.md)
2. Remediate documented desync:
   ```bash
   npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs \
     --order-id 06a3f2e8-dd6d-4f2a-958f-316811b519db
   ```
3. Re-run go/no-go after Day 7 snapshot

---

## Rollback (if AUTO_APPLY enabled prematurely)

```bash
FSM_ORCHESTRATOR_AUTO_APPLY=false
# or FSM_ORCHESTRATOR_ENABLED=false
pm2 restart ecosystem.config.cjs
./scripts/staging-baseline.sh
```

**Duration:** &lt;5 minutes.

---

## P0 launch note

AUTO_APPLY is **out of scope** for initial production go-live (flags OFF). This NO-GO does **not** block P0 pilot launch.
