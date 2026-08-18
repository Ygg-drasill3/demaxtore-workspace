# Integration Hardening — Phase B Report

**Status:** ✅ Complete
**Date:** 2026-06-02

## What was delivered

### 1. Unified Prisma schema (`apps/backend/prisma/schema.prisma`)
Merges Sprint 1 (auth, sessions, notifications) + Sprint 2 (RFQ workspace, timeline, clarifications, audit) + Sprint 2.5 (supplier-activity, telemetry, idempotency, structured quotations + line items, attachment versioning).

Models (20): `Organisation`, `User`, `RefreshToken`, `PasswordResetToken`, `Workspace`, `WorkspaceParticipant`, `TimelineEvent`, `RfqDetails`, `RfqLineItem`, `RfqAttachment`, `SupplierAssignment`, `Quotation`, `QuotationLineItem`, `ClarificationThread`, `ClarificationMessage`, `ClarificationReadReceipt`, `Notification`, `AuditLog`, `SupplierActivityLog`, `TelemetryEvent`, `IdempotencyKey`.

Enums (7): `Role`, `WorkspaceType`, `ParticipantRole`, `NotificationType`, `QuotationStatus`, `ClarificationVisibility`, `SupplierStage`.

### 2. State-guard SQL migration (`apps/backend/prisma/migrations/state-guard-trigger.sql`)
Defense-in-depth invariants that Prisma cannot express:
- Partial unique index for ACTIVE supplier assignments.
- Trigger `workspaces_state_guard` — blocks direct UPDATE of `workspaces.state` unless `app.fsm_authorised = 'true'` is set in the transaction (forces all transitions through `applyTransition()`).
- Trigger `workspaces_currency_guard` — currency immutable after publish (FSM Decision #11).
- Append-only `audit_logs` and `timeline_events` (REVOKE UPDATE/DELETE).
- CHECK constraints `chk_deadline_extension_count <= 2` and `chk_deadline_extension_total_days <= 14` (FSM Decision #5).

### 3. Seed script (`apps/backend/prisma/seed.ts`)
Idempotent (upserts). Creates:
- 3 organisations (DeMaxtore Ops, Acme Trading, Beta Imports) + 2 supplier orgs.
- 7 users (1 admin · 2 buyers · 4 suppliers). All share password **`Passw0rd!`**.
- 3 demo RFQ workspaces spanning canonical states (`RFQ_OPEN`, `UNDER_EVALUATION`, `PROFORMA_RECEIVED`).
- Sample line items, quotations, supplier activity, notifications.

## Verification

```bash
$ npx prisma migrate dev --name init --skip-seed
✔ Applying migration `20260602124035_init`

$ psql -f prisma/migrations/state-guard-trigger.sql
✔ All triggers and constraints applied

$ npx prisma db seed
🌱 Seeding DeMaxtore dev database…
  · users: 7
  · workspaces: RFQ-2026-0001 (RFQ_OPEN), RFQ-2026-0002 (UNDER_EVALUATION), RFQ-2026-0003 (PROFORMA_RECEIVED)
✓ Seed complete.
```

## Credentials
See `/app/memory/test_credentials.md`.

## Next: Phase C — Backend Bootstrap
- Express server, `/api` router, error middleware, health endpoint.
- **MANDATORY:** Call `integration_playbook_expert_v2` for the Auth module (JWT access + refresh, bcrypt, password reset).
- Notifications service + Socket.io scaffolding.
