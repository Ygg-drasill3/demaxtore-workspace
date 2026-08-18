# Exception Engine V2 Rollout Runbook

**Owner:** Ops / Platform  
**Flag:** `EXCEPTION_ENGINE_V2_ENABLED=true`

---

## Prerequisites

- P2 orchestrator auto-apply stable (recommended)
- Exception Hub E2E green: `29-exception-hub.spec.ts`
- Control Tower E2E green: `08-control-tower.spec.ts`

---

## Enablement

```bash
EXCEPTION_ENGINE_V2_ENABLED=true
# restart backend
```

---

## Validation

```bash
yarn workspace @dmx/backend vitest run exception-engine
yarn workspace @dmx/e2e test tests/29-exception-hub.spec.ts
yarn workspace @dmx/e2e test tests/08-control-tower.spec.ts
```

Checks:
- Control Tower alert → `TradeException` / ExceptionCase opened
- Duplicate exception not created for same alert key
- SLA and owner assigned per severity
- Legacy Exception Hub list/detail still works

---

## Rollback

```bash
EXCEPTION_ENGINE_V2_ENABLED=false
```

Effect: alert-engine uses legacy exception path only.

---

## Log signals

- `exception.created` timeline events
- Dedup via alert key + workspace id in exception engine

---

## Known risks

- High alert volume may increase exception count — monitor SLA backlog
