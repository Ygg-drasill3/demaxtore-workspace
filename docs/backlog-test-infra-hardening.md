# Backlog — Test Infrastructure Hardening

Items deferred from Sprint D Faz 4. Sprint E (Mini) addressed several items — see status below.

---

## 1. Backend full test suite HTTP 404 (port/config)

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Resolved (Sprint E)** |
| **Problem** | `commoditybid.scheduler.test.ts` and `commoditybid.sealed-bid.test.ts` defaulted to `http://localhost:8001` while CI/E2E use port **3001**, causing 404 when no server listened on 8001. |
| **Root cause** | Hard-coded legacy port in `TEST_API_URL` fallback; vitest did not start or probe an API server. |
| **Fix** | `src/test/integration-http.ts` resolves `TEST_API_URL` → `E2E_API_URL` → `http://127.0.0.1:3001`; `vitest.global-setup.ts` probes `/api/healthz` and spawns backend if needed; CI sets `TEST_API_URL`. |
| **Priority** | ~~High~~ Done |

---

## 2. `scheduler-lock.test.ts` flaky concurrency

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Resolved (Sprint E)** |
| **Problem** | Parallel `Promise.all` allowed second acquirer to run after first released lock (`innerRuns === 2`). |
| **Root cause** | Test measured concurrent exclusion but both tasks could succeed sequentially when first finished before second attempted `try_advisory_lock`. |
| **Fix** | Hold first lock until explicit release; poll until first holder enters; assert second returns `false` while first holds; verify third acquire after release. |
| **Priority** | ~~Medium~~ Done |

---

## 3. CommodityBid E2E scheduler polling timeout risk

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Resolved (Sprint E)** |
| **Problem** | `waitForCommodityBidLive` polled up to 40×1.5s waiting for wall-clock auction start. |
| **Root cause** | Real-time scheduler dependency for SCHEDULED → LIVE transition. |
| **Fix** | `e2e-force-cb-auction-live.mjs` + `commoditybid-test-utils.ts` backdate invitation/start clocks; scheduler ticks advance to LIVE without wall-clock wait. Removed invalid `join-auction` calls when already LIVE. |
| **Priority** | ~~Medium~~ Done |

---

## 4. DB script dependency for deadline E2E test

| Field | Detail |
|-------|--------|
| **Status** | 🟡 **Partially mitigated** |
| **Problem** | Deadline guard E2E uses `e2e-backdate-workspace-deadline.mjs` via `execSync` (requires DB access from Playwright runner). |
| **Impact** | CI must run E2E on same host as Postgres with `apps/backend` cwd; not pure HTTP. |
| **Proposed fix** | Admin test-only endpoint gated by `NODE_ENV=test` (future). |
| **Priority** | Low–Medium |

---

## 5. Frontend lint not yet run

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Resolved (Sprint E)** |
| **Problem** | `eslint` binary not in `@dmx/frontend` devDependencies; `yarn lint` exited 127. |
| **Fix** | Added `eslint`, `typescript-eslint`, React plugins, and `eslint.config.js` with baseline rules (`no-explicit-any` → warn for legacy debt). |
| **Result** | `yarn workspace @dmx/frontend lint` **PASS** (warnings only, no errors). |
| **Priority** | ~~Low~~ Done |

---

## Sprint E validation snapshot

| Check | Result |
|-------|--------|
| `yarn workspace @dmx/backend test` | **PASS** — 20/20 |
| `yarn workspace @dmx/backend test:unit` | **PASS** — 14/14 |
| `yarn workspace @dmx/backend tsc --noEmit` | **PASS** |
| `yarn workspace @dmx/frontend typecheck` | **PASS** |
| `yarn workspace @dmx/frontend build` | **PASS** |
| `39-production-hardening.spec.ts` | **PASS** — 18/18 (after deadline backdate fix) |
| `yarn workspace @dmx/frontend lint` | **PASS** — 0 errors, 46 warnings (legacy `any` debt) |
