# Sprint 6B — Playwright Results

## Spec

`apps/e2e/tests/17-freight-revenue-optimization.spec.ts`

## Sprint 6B suite (isolated run)

| # | Scenario | Result |
|---|----------|--------|
| 01 | Create margin policy | PASS |
| 02 | Suggested margin applied on intake | PASS |
| 03 | Manual margin override | PASS |
| 04 | Revenue by route visible | PASS |
| 05 | Forwarder scorecard visible | PASS |
| 06 | Low margin alert | PASS |
| 07 | Negative margin alert | PASS |
| 08 | Revenue per container calculation | PASS |
| 09 | Top route dashboard API | PASS |
| 10 | CSV export | PASS |
| 11 | Role visibility | PASS |

**11 / 11 PASS** (2026-06-04)

## Full regression (01 → 17)

**136 / 136 PASS** (2026-06-04, ~1.7m)

Includes all prior suites (01–16) plus new spec 17 (+11 tests).

## Contracts

65 / 65 PASS

## Backend unit

12 / 13 PASS — one pre-existing failure in `state-guard.test.ts` (unrelated to Sprint 6B).

## Sprint 6B E2E gate

**PASS**
