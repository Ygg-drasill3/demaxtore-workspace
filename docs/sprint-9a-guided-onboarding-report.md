# Sprint 9A — Guided Onboarding Report

## Summary

Sprint 9A delivers a **parallel checklist engine** for first-trade success. No workspace FSMs were modified.

## Deliverables

| Phase | Artifact | Status |
|-------|----------|--------|
| 1 | `packages/contracts/src/onboarding.ts` | ✓ |
| 2 | Migration `20260605140000_sprint9a_guided_onboarding` | ✓ |
| 3 | `apps/backend/src/modules/onboarding/` | ✓ |
| 4 | `GuidedOnboardingCard` | ✓ |
| 5 | Role checklists (buyer/supplier/operator) | ✓ |
| 6 | `WorkspaceGuidancePanel` (delegates to next-action engines) | ✓ |
| 7 | `TradeProgressBar` (visual, derived from trade signals) | ✓ |
| 8 | `ProductTour` (≤5 steps per role) | ✓ |
| 9 | `/learning` Learning Center | ✓ |
| 10 | `/onboarding` Admin dashboard | ✓ |
| 11 | Control Tower onboarding alerts | ✓ |
| 12 | Audit events | ✓ |
| 13 | Socket events (`onboarding.updated`, `first_trade.completed`) | ✓ |
| 14 | CSV exports (admin) | ✓ |
| 15 | `22-guided-onboarding.spec.ts` — **12/12 PASS** | ✓ |

## Architecture

- **Journey engine**: `computeOnboardingJourney()` in contracts — pure function over trade signals.
- **Backend sync**: `OnboardingService.getOrSyncProgress()` reads existing RFQ/order/shipment/document data and persists to `user_onboarding_progress`.
- **Workspace guidance**: `GET /api/onboarding/guidance/:type/:id` calls existing `compute*NextActions()` — zero duplicated CTA logic.
- **Alerts**: `scanOnboardingAlerts()` registered in `AlertEngine.runFullScan()`.

## API Routes

```
GET  /api/onboarding/progress
GET  /api/onboarding/tour
POST /api/onboarding/tour/complete
GET  /api/onboarding/learning
POST /api/onboarding/learning/open
GET  /api/onboarding/guidance/:workspaceType/:workspaceId
GET  /api/onboarding/dashboard          (ADMIN)
GET  /api/onboarding/users              (ADMIN)
GET  /api/onboarding/export/:type.csv   (ADMIN)
```

## Frontend Routes

- `/learning` — all authenticated roles
- `/onboarding` — ADMIN only
- Dashboard widgets on buyer/supplier dashboards
- Trade progress bar in RFQ workspace header
