# Backlog — Test Infrastructure Hardening

Items deferred from Sprint D Faz 4. Isolated from production feature work; address in a dedicated infra sprint.

---

## 1. Backend full test suite HTTP 404 (port/config)

| Field | Detail |
|-------|--------|
| **Problem** | `commoditybid.scheduler.test.ts` and `commoditybid.sealed-bid.test.ts` call live HTTP endpoints and receive 404 on workspace create. Vitest does not start or align with the API server port (`E2E_API_URL` / default 3001 vs test default). |
| **Impact** | `yarn workspace @dmx/backend test` fails even when unit logic is correct. CI cannot gate on full backend test suite without flaky or skipped HTTP suites. |
| **Proposed fix** | Standardise test bootstrap: read `TEST_API_BASE` from env, document in `apps/backend/README` or vitest setup; optionally spin up in-process Express app for HTTP integration tests instead of external server. Mark HTTP suites with explicit `@integration` tag and separate npm script. |
| **Priority** | **High** — blocks reliable CI for backend |

---

## 2. `scheduler-lock.test.ts` flaky concurrency

| Field | Detail |
|-------|--------|
| **Problem** | Advisory lock test `allows only one concurrent holder` intermittently observes `innerRuns === 2` instead of 1 under parallel load or shared DB state. |
| **Impact** | `yarn workspace @dmx/backend test:unit` is non-deterministic; false failures in CI and local dev. |
| **Proposed fix** | Use isolated DB connection per test, increase lock hold duration in test, or run lock tests serially (`describe.sequential` + dedicated schema). Consider mocking `pg_advisory_lock` for unit layer and one true integration test in CI only. |
| **Priority** | **Medium** — unit suite reliability |

---

## 3. CommodityBid E2E scheduler polling timeout risk

| Field | Detail |
|-------|--------|
| **Problem** | `setupLiveCommodityBid` polls admin scheduler tick until `LIVE` (~3–40 attempts × 1.5s). Slow CI hosts or scheduler backlog can exceed default Playwright timeout. |
| **Impact** | Production hardening spec (`39-production-hardening.spec.ts`) CommodityBid tests may flake in CI despite passing locally. |
| **Proposed fix** | Reduce poll interval when `NODE_ENV=test`; add admin test hook to force `auction_started` without wall-clock wait; increase `test.setTimeout` only for CB describe block; cache LIVE workspace in serial suite where safe. |
| **Priority** | **Medium** — E2E stability |

---

## 4. DB script dependency for deadline E2E test

| Field | Detail |
|-------|--------|
| **Problem** | CommodityBid deadline guard tests call `e2e-backdate-workspace-deadline.mjs` via `execSync`, requiring direct Prisma/DB access from Playwright runner and correct `E2E_REPO_ROOT` / cwd. |
| **Impact** | Tests fail in environments without DB credentials on the E2E runner, or when cwd differs from monorepo root. Not pure HTTP E2E. |
| **Proposed fix** | Replace script with admin-only test endpoint (`POST /api/admin/test/backdate-deadline`) gated by `NODE_ENV=test`, or use Prisma in Playwright globalSetup with shared helper module instead of shell exec. |
| **Priority** | **Low–Medium** — portability and CI setup complexity |

---

## 5. Frontend lint not yet run

| Field | Detail |
|-------|--------|
| **Problem** | Sprint D validation did not include `yarn workspace @dmx/frontend lint`. Lint debt in frontend may be unrelated to Sprint D but is unknown. |
| **Impact** | Pre-commit/CI may fail on lint when enabled; undetected style and a11y issues in RFQ and workspace UI. |
| **Proposed fix** | Add lint to Sprint D smoke checklist; run `yarn workspace @dmx/frontend lint` in CI pipeline; fix or baseline existing violations in a separate PR. |
| **Priority** | **Low** — quality gate, not blocking Sprint D runtime |

---

## Related Sprint D artifacts (in scope, validated)

- `apps/e2e/tests/39-production-hardening.spec.ts` — 18/18 PASS
- `winner-engine.test.ts`, `commoditybid.preconditions.test.ts` — PASS
- `tsc --noEmit`, `prisma migrate status` — PASS
