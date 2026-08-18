# Sprint 5E — Playwright Results

## Suite

`apps/e2e/tests/14-workspace-communication.spec.ts`

## Scenarios

| # | Scenario |
|---|----------|
| 01 | Buyer sends message (API) |
| 02 | Supplier replies (UI) |
| 03 | Admin internal note hidden from buyer |
| 04 | Question → timeline entry |
| 05 | Read receipt |
| 06 | Workspace message search |
| 07 | Role isolation (supplier cannot post INTERNAL_NOTE) |
| 08 | Control Tower `comm_question_unread_48h` |
| 09 | Attachment on message |

## Latest run

| Suite | Result |
|-------|--------|
| `14-workspace-communication.spec.ts` | **9/9 PASS** |

## Regression

Full suite: `cd apps/e2e && npx playwright test` (97 tests including this suite).
