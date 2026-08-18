# Shadow Soak — Day 1

**Date:** 2026-06-17  
**Script:** `./scripts/p1-shadow-soak-daily.sh`  
**Artifacts:** `.data/shadow-soak/20260617.md`, `.data/shadow-soak/20260617.json`, `.data/shadow-soak/20260617-desync.json`

---

## Flag state at snapshot

| Flag | Value |
|------|-------|
| `FSM_ORCHESTRATOR_ENABLED` | **false** (not in `.env` — P0 default) |
| `FSM_ORCHESTRATOR_SHADOW_MODE` | **false** |
| `FSM_ORCHESTRATOR_AUTO_APPLY` | **false** |

**Note:** Shadow recommendations require orchestrator **enabled** + shadow mode on a **running** backend with live traffic. This Day 1 snapshot is a **baseline audit** under P0 flags OFF.

---

## Metrics

| Metric | Value |
|--------|------:|
| Active orders | 121 |
| Active shipments | 47 |
| Recommendations (sampled) | 0 |
| Shadow mode recs | 0 |
| Applied recs | 0 |
| Mirror mismatches | 0 |
| Desync pairs | 1 (documented) |
| Undocumented desync | 0 |
| Exceptions (7d) | 175 |
| Duplicate processed_event groups | 0 |
| Payment timeline events | 11 |
| Carrier event records | 0 |

---

## Day 1 assessment

- No mirror mismatches in sample (no shadow recs generated — flags off)
- Desync stable at 1 documented pair
- No webhook duplicate groups detected

**Next:** Enable shadow flags on staging backend, restart PM2, run daily script for Days 2–7 with real traffic.
