# Sprint 6A — Release Blocker Fix Pack

**Scope:** Infrastructure fixes only — no new features, no FSM/schema/UI product changes (except test corrections).

## 1. Upload / storage

**Root cause:** `STORAGE_DIR` defaulted to `/var/dmx/uploads`, which is not writable in local dev/E2E, causing `INTERNAL` errors on RFQ attachments, trade documents, and communication uploads.

**Fix:**

- Added `apps/backend/src/lib/file-storage.ts` — resolves a writable directory (configured path, then `apps/backend/.data/uploads`, then repo `.data/uploads`).
- Wired all upload paths through `writeStoredFile()` / `storagePathFor()`:
  - RFQ attachments (`attachments.service.ts`)
  - Trade documents (`documents.routes.ts`)
  - Workspace communication (`communication.service.ts`)
  - Order / shipment document routes
- Default `STORAGE_DIR` → `./.data/uploads` in `env.ts` and `.env.example`
- Local `.env` updated to `./.data/uploads`
- `.data/` added to `.gitignore`

## 2. Scheduler advisory lock

**Root cause:** `pg_try_advisory_lock` / unlock ran on separate pooled connections, so two concurrent callers could both acquire the lock.

**Fix:** `withSchedulerLock` now runs acquire → `fn` → unlock inside a single `prisma.$transaction()` (one session).

**Result:** `scheduler-lock.test.ts` passes (13/13 backend tests).

## 3. Pilot readiness orders bucket test

**Root cause:** Test expected global `orders-list-empty` on **Completed** bucket, but the DB contains other `CLOSED` orders from prior E2E runs. The pilot order (still active) was correctly excluded; the list was not empty.

**Fix:** Assert `orders-list-row-{orderId}` is **not visible** under Completed (correct product behavior).

**Additional (test 09):** Wrong API roles — `skip_inspection` (buyer/admin), `book_shipment` (admin only). Updated tokens; removed redundant `proceed-to-freight` after skip.

## Re-run closure gate

After backend restart (tsx picks up `file-storage`), run full Playwright + backend vitest again.
