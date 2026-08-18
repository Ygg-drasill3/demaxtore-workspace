# DeMaxtore — Sprint 2 Implementation Plan
**Scope:** `STANDARD_RFQ_WORKSPACE` only — RFQ creation through FSM-driven lifecycle.
**Stack (FROZEN):** React + Vite + TailwindCSS · Node.js + Express · PostgreSQL + Prisma · JWT + Refresh · Socket.io.
**Source of truth:** `./rfq-state-machine.md` (15 states · 40 transitions · 12 decisions). **Not negotiable in Sprint 2.**

> **Companion reference code:** `./sprint-2-reference-code/` — copy-paste ready files.
> **Out of scope:** CommodityBid, Order, PO, Proforma, FreightIQ, Inspection, Shipment.

---

## How to use this document

This is a **Plan-Mode** output. Read in order; do **not** start coding before §0–§14 are reviewed and §19 DoD is understood. Every code block here is a contract — implementation must match shape exactly.

---

## §0. Pre-flight consistency check vs. RFQ FSM

| Sprint 2 deliverable                  | FSM section that drives it                              | Reflection |
|---------------------------------------|----------------------------------------------------------|------------|
| Buyer "Create Draft RFQ" form         | §3 transitions #1, #2                                    | `RFQ_DRAFT` initial state |
| Buyer "Submit RFQ"                    | §3 transition #3                                         | `RFQ_DRAFT → RFQ_SUBMITTED` |
| Admin Review queue                    | §3 transitions #5, #6                                    | reads `RFQ_SUBMITTED` |
| Assign Suppliers                      | §3 transitions #5, #8, #9                                | `SUPPLIERS_ASSIGNED` |
| Publish RFQ                           | §3 transition #10                                        | `RFQ_OPEN` |
| Clarifications                        | §3 transition #15                                        | stays in `RFQ_OPEN` |
| Timeline + Audit                      | §6 audit taxonomy + §3 column 6                          | every transition writes 1 row |
| Notifications                         | §7 notification trigger table                            | per-transition recipient list |
| Next Action Engine                    | §5 permission matrix + §3 allowed actions                | derived, never hardcoded |
| revise_rejected_rfq                   | §3 transition #37                                        | Decision #6 enforced |
| Extend deadline                       | §3 transition #16 (≤2× / ≤14d total)                     | Decision #5 enforced |
| Reopen quotations                     | §3 transition #22 (ADMIN-only)                           | Decision #4 enforced |
| Currency lock                         | §0 Decision #11 (Buyer picks, immutable post-publish)    | Buyer form + publish guard |

If any deliverable below contradicts a row above → **stop and escalate**, do not implement.

---

## §1. Technical Design

### 1.1 Database Design

Sprint 1 schema retained (users, refresh_tokens, password_reset_tokens, login_attempts, workspaces, workspace_participants, timeline_events, notifications).

**Sprint 2 deltas (new tables):**
- `rfq_details` (1:1 with `workspaces` where `type = STANDARD_RFQ_WORKSPACE`)
- `rfq_line_items` (N per RFQ)
- `rfq_attachments` (N per RFQ)
- `supplier_assignments` (N per RFQ)
- `clarification_threads` (1 per RFQ, lazy-created on first message)
- `clarification_messages` (N per thread)
- `audit_logs` (separate from timeline_events; immutable security log)
- `notifications` extended with `workspace_id`, `event_type` columns

**Sprint 2 deltas (existing tables):**
- `workspaces.state` → string (was enum) per RFQ FSM §11 Decision #8
- `workspaces.currency` → string, ISO-4217
- `workspaces.deadline_at`, `deadline_extension_count`, `deadline_extension_total_days`
- `workspaces.proforma_requested_at`, `proforma_sla_deadline_at`
- `workspaces.spawned_from_id` (real FK, Sprint 2 won't use it — RFQ doesn't get spawned; reserved for Order in Sprint 3)

See `./sprint-2-reference-code/prisma-sprint2-rfq.prisma` for full schema additions.

### 1.2 API Architecture

**Convention:** REST, JSON, `/api` prefix, `Authorization: Bearer <jwt>` header. Standard error envelope:
```json
{ "error": { "code": "INVALID_TRANSITION", "message": "...", "details": {...} } }
```

**Module layout (`apps/backend/src/modules/rfq/`):**
- `rfq.routes.ts` — Express router (signatures only)
- `rfq.controller.ts` — request/response shaping, calls service
- `rfq.service.ts` — business logic, calls `applyTransition()` and Prisma
- `rfq.policy.ts` — `canAccessRfq(user, workspaceId) → boolean` (participant-based)
- `rfq.fsm.ts` — imports `@dmx/contracts` FSM, exposes `applyTransition()`
- `rfq.next-actions.ts` — pure function deriving CTAs from current state + user
- `rfq.notifications.ts` — recipient resolution per transition

### 1.3 Service Architecture

```
HTTP Controller
   ↓
RfqService (public methods: createDraft, submit, get, list, applyAction, postClarification, …)
   ↓
applyTransition(workspaceId, action, actor, payload)   ← single mutation entrypoint
   ↓ (inside transaction)
   1. Lock workspace row (SELECT ... FOR UPDATE)
   2. Verify FSM rule (current state + actor role + participant constraint + preconditions)
   3. UPDATE workspaces.state + role-specific fields
   4. INSERT timeline_events row
   5. INSERT audit_logs row
   6. INSERT notifications rows (per §7 trigger matrix)
   7. Schedule deferred socket emits (post-commit hook)
   ↓
COMMIT → fire socket.io broadcasts
```

**Single-mutation invariant:** `RfqService` is the **only** module allowed to call `prisma.workspace.update({ data: { state: ... } })`. Enforced by:
- ESLint custom rule banning `state:` in `prisma.workspace.update` outside `rfq.service.ts`
- Vitest test reading repo for offending patterns

### 1.4 Frontend Architecture

```
apps/frontend/src/features/rfq/
├── pages/
│   ├── RfqListPage.tsx           # /buyer/rfq, /admin/rfq, /supplier/rfq
│   ├── RfqCreatePage.tsx         # /buyer/rfq/new
│   └── RfqWorkspacePage.tsx      # /workspace/rfq/:id  ← centerpiece
├── components/
│   ├── RfqHeader.tsx
│   ├── RfqProgressBar.tsx        # renders FSM state as a 7-step bar
│   ├── RfqTimeline.tsx           # consumes timeline_events
│   ├── RfqDocuments.tsx
│   ├── RfqParticipants.tsx
│   ├── RfqClarifications.tsx     # threaded messages
│   ├── RfqNextActions.tsx        # CTAs from Next Action Engine
│   ├── RfqLineItemsEditor.tsx    # used in CreatePage + edit-draft mode
│   ├── AssignSuppliersDialog.tsx # admin-only
│   └── ExtendDeadlineDialog.tsx
├── hooks/
│   ├── useRfqWorkspace.ts        # TanStack Query: GET /api/rfq/:id
│   ├── useRfqList.ts             # TanStack Query: GET /api/rfq
│   ├── useApplyRfqAction.ts      # TanStack mutation
│   └── useRfqSocket.ts           # subscribes to ws:{id} room
└── lib/
    ├── rfq.api.ts                # axios wrappers
    └── rfq.types.ts              # re-exports from @dmx/contracts
```

### 1.5 State Machine Integration Design

Single import path enforced:
```ts
// CORRECT — everywhere
import { RFQ_TRANSITIONS, type RfqState, type RfqAction } from "@dmx/contracts";

// WRONG — banned by ESLint rule
const STATE_BUYER_CAN_CANCEL = ["RFQ_DRAFT", "RFQ_OPEN", ...];   // ❌ hardcoded
```

Frontend Next-Action buttons:
```tsx
// RfqNextActions.tsx — exhaustive switch never lives here; data-driven
const actions = computeNextActions({ state: rfq.state, role: user.role, isOwner, participantRole });
return actions.map(a => <Button onClick={() => apply(a)}>{a.label}</Button>);
```

### 1.6 Timeline Architecture

`timeline_events` is append-only. Sprint 2 reuses Sprint 1 table; adds `workspaceId` index already present.

**Write rule:** Only `applyTransition()` writes to `timeline_events`. No exception.
**Read rule:** `GET /api/rfq/:id/timeline?limit=50&cursor=…` — cursor-based, newest first.
**Render rule:** Frontend groups consecutive events of same `actor_user_id` within 5 minutes.

### 1.7 Notification Architecture

Sprint 1 framework (notifications table + bell + page + socket) is reused. Sprint 2 additions:
- `notifications.workspace_id` column → in-app deep-links to `/workspace/rfq/:id`
- `notifications.event_type` column → mirrors `timeline_events.event_type`
- Recipient resolver: pure function `resolveRecipients(transition, workspace, participants) → User[]`

### 1.8 Next Action Engine Design

```ts
// Pure function, runs both server-side (for API hint) and client-side (for UI render)
function computeNextActions(input: {
  state: RfqState;
  actorRole: Role;
  isOwner: boolean;          // true if user is workspace OWNER
  participantRole?: ParticipantRole;
}): NextAction[] {
  return RFQ_TRANSITIONS
    .filter(t => t.from === input.state || t.from === "*")
    .filter(t => t.allowedRoles.includes(input.actorRole))
    .filter(t => satisfiesParticipantConstraint(t, input))
    .map(toNextActionCTA);
}
```

UI buttons → `RfqNextActions` map purely over output.

---

## §2. Database Implementation

See **`./sprint-2-reference-code/prisma-sprint2-rfq.prisma`** for the full schema patch. Highlights:

- `workspaces.state` becomes `String` (per FSM §11 migration plan); old `WorkspaceState` enum dropped.
- `rfq_details.currency` mirrors `workspaces.currency` for query convenience.
- `rfq_line_items` uses `Decimal(18, 4)` for quantity to match FX precision.
- `audit_logs` has no FK to `users` — keep immutable even if a user is later deleted; instead store `actor_user_id` + `actor_email` + `actor_role` snapshots at write time.
- Partial unique index ensures one active `supplier_assignments` row per (workspace, supplier).

Migration command:
```bash
cd apps/backend
pnpm prisma migrate dev --name sprint2_rfq_workflow
pnpm tsx prisma/seed-sprint2.ts   # adds 3 demo suppliers + 1 sample RFQ
```

---

## §3. RFQ Creation Flow (Buyer)

### 3.1 API
| Method | Path                          | Body / Query                                              | Returns                |
|--------|-------------------------------|-----------------------------------------------------------|------------------------|
| POST   | `/api/rfq`                    | `CreateRfqDraftInput` (see zod schema)                    | `RfqDTO` (state=DRAFT) |
| GET    | `/api/rfq/:id`                | —                                                          | `RfqDTO`               |
| PATCH  | `/api/rfq/:id/draft`          | `EditRfqDraftInput`                                       | `RfqDTO`               |
| POST   | `/api/rfq/:id/actions/submit` | `{ idempotencyKey?: string }`                              | `RfqDTO` (state=SUBMITTED) |

`CreateRfqDraftInput` (zod, in `@dmx/contracts`):
```ts
z.object({
  title: z.string().min(3).max(200),
  productCategory: z.string().min(1),
  productDescription: z.string().min(10).max(5000),
  targetMarket: z.string().min(1),                      // ISO country code or free text
  incoterm: z.enum(["FOB","CIF","CFR","EXW","DDP"]),    // Sprint 2 limited set
  currency: z.enum(["USD","EUR","GBP"]),                // Decision #11 — frozen list
  deadlineAt: z.string().datetime(),                    // ISO 8601, must be future
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    uom: z.string().min(1),
    notes: z.string().optional(),
  })).min(1),                                            // FSM §3 transition #3 precondition
  attachmentIds: z.array(z.string().uuid()).optional(), // S3 keys pre-uploaded
});
```

### 3.2 Submit precondition validator (server)
```ts
function assertSubmitPreconditions(rfq: RfqRecord) {
  if (rfq.lineItems.length < 1)            throw new AppError(400, "RFQ_EMPTY_LINE_ITEMS");
  if (new Date(rfq.deadlineAt) <= new Date()) throw new AppError(400, "RFQ_DEADLINE_PAST");
  if (!rfq.currency)                       throw new AppError(400, "RFQ_NO_CURRENCY");
  for (const f of ["title", "productCategory", "productDescription", "incoterm", "targetMarket"]) {
    if (!rfq[f]) throw new AppError(400, "RFQ_MISSING_FIELD", { field: f });
  }
}
```

### 3.3 FSM transition trigger
On `POST /api/rfq/:id/actions/submit`:
- `applyTransition(workspaceId, "submit_rfq", actor)`
- FSM §3 #3 fires → state `RFQ_SUBMITTED` → timeline event `rfq.submitted` → notification broadcast `role:ADMIN`.

### 3.4 UI page — `RfqCreatePage.tsx`
- Single-page form, sectioned: **Overview → Specs → Line Items → Attachments → Review**.
- "Save Draft" calls `POST /api/rfq` then redirects to `/workspace/rfq/:id` (in DRAFT state with edit affordance).
- "Submit" calls `POST /api/rfq/:id/actions/submit` after client-side validation.
- Form state: `react-hook-form` + `zodResolver(CreateRfqDraftInput)`.

---

## §4. RFQ List Page

### 4.1 API
| Method | Path                         | Query                                                       | Returns |
|--------|------------------------------|-------------------------------------------------------------|---------|
| GET    | `/api/rfq`                   | `?state=…&from=…&to=…&q=…&sort=newest|oldest|deadline&cursor&limit` | `Page<RfqListItem>` |

`RfqListItem`:
```ts
z.object({
  id: z.string().uuid(),
  externalRef: z.string(),                  // e.g. "WS-RFQ-2026-00012"
  title: z.string(),
  state: z.string(),                        // RfqState
  createdAt: z.string().datetime(),
  deadlineAt: z.string().datetime().nullable(),
  lastActivityAt: z.string().datetime(),    // max(updated_at, latest timeline event)
  ownerName: z.string(),
});
```

### 4.2 Visibility scoping (role-aware list)
- BUYER: WHERE `owner_id = me` OR participant of OBSERVER
- SUPPLIER: WHERE participant (COUNTERPARTY) AND state ∈ `["RFQ_OPEN","QUOTATIONS_CLOSED","UNDER_EVALUATION","SUPPLIER_SELECTED","PROFORMA_REQUESTED","PROFORMA_RECEIVED","PROFORMA_APPROVED","PO_ISSUED"]` (i.e. published or later)
- ADMIN: all RFQs

### 4.3 UI page
- Columns per spec (RFQ Number / Title / Current State / Created / Deadline / Last Activity / Actions).
- Filter chips for state + date range; debounced search input.
- Action menu per row: "Open" (always), "Cancel" (if `cancel_rfq` allowed by FSM for this user+state), "Extend Deadline" (if applicable).
- Empty state with primary CTA (Buyer: "Create RFQ"; Supplier: copy "No assignments yet"; Admin: "No submitted RFQs").

---

## §5. RFQ Workspace Page (centerpiece)

### 5.1 Layout
```
┌────────────────────────────────────────────────────────────────────┐
│ RfqHeader                                                          │
│   externalRef · title · stateBadge · currency · ownerName · created│
├──────────────────────────────────────────────┬─────────────────────┤
│ RfqProgressBar (7-step, derived from state)  │ RfqNextActions      │
├──────────────────────────────────────────────┤   (FSM-driven CTAs) │
│ Tabs:                                        │                     │
│   ▸ Timeline   ▸ Line Items   ▸ Documents    │ RfqParticipants     │
│   ▸ Clarifications   ▸ Quotations            │                     │
│                                              │                     │
│ (active tab content)                         │ Workspace Inbox     │
│                                              │ (workspace notifs)  │
└──────────────────────────────────────────────┴─────────────────────┘
```

### 5.2 Tabs

| Tab            | Content source                                                 | Roles that see it |
|----------------|----------------------------------------------------------------|-------------------|
| Timeline       | `GET /api/rfq/:id/timeline`                                    | all participants  |
| Line Items     | `rfq.lineItems`                                                | all participants  |
| Documents      | `GET /api/rfq/:id/attachments`                                 | all participants  |
| Clarifications | `GET /api/rfq/:id/clarifications`                              | all participants  |
| Quotations     | placeholder rows from `quotation_placeholders` (Sprint 2 stub) | BUYER, ADMIN; SUPPLIER sees only own |

> **Quotations tab in Sprint 2 = placeholder.** Real quotation submission lands in Sprint 2.5 or Sprint 3.

### 5.3 Progress bar mapping
```
RFQ_DRAFT             → step 1
RFQ_SUBMITTED         → step 2
SUPPLIERS_ASSIGNED    → step 3
RFQ_OPEN              → step 4
QUOTATIONS_CLOSED     → step 5
UNDER_EVALUATION      → step 5 (active)
SUPPLIER_SELECTED     → step 6
PROFORMA_REQUESTED    → step 6 (active)
PROFORMA_RECEIVED     → step 6 (active)
PROFORMA_APPROVED     → step 7
PO_ISSUED             → step 7 (complete)
REJECTED_BY_ADMIN     → red badge "Returned"
CANCELLED / EXPIRED / CLOSED_NO_AWARD → grey "Closed"
```

### 5.4 Realtime
`useRfqSocket(id)` joins `workspace:{id}` room; listens for:
- `rfq.state.changed` → refetch
- `rfq.timeline.appended` → optimistic prepend
- `rfq.clarification.posted` → refetch clarifications
- `notification:new` → toast + bell badge

---

## §6. RFQ FSM Implementation

`applyTransition()` is the single mutation entrypoint. Reference implementation: **`./sprint-2-reference-code/rfq.service.ts`**.

### 6.1 Contract
```ts
interface ApplyTransitionInput {
  workspaceId: string;
  action: RfqAction;
  actor: { id: string; role: Role };
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  reason?: string;
}

interface ApplyTransitionResult {
  workspace: RfqDTO;
  timelineEventId: string;
  auditLogId: string;
  notificationsCreated: number;
}
```

### 6.2 Validation pipeline (in order)
1. Lock workspace row (`SELECT … FOR UPDATE`).
2. Verify `actor` is a participant or `actor.role === "ADMIN"`.
3. Find matching `RFQ_TRANSITIONS` entry where `from === workspace.state && action === input.action`. → 400 `UNKNOWN_ACTION` if missing.
4. Verify `actor.role ∈ transition.allowedRoles`. → 403 `FORBIDDEN_ROLE`.
5. Verify `participantConstraint` (OWNER / COUNTERPARTY / OPERATOR / ANY). → 403 `FORBIDDEN_PARTICIPANT`.
6. Verify `requiresReason` if true → 400 `REASON_REQUIRED`.
7. Run transition-specific preconditions (lookup table by action name).
8. Run side-effects in transaction (state update, line items if needed, timeline, audit, notifications).
9. Schedule socket emits in post-commit hook.

### 6.3 Specific precondition handlers (Sprint 2 subset)
| Action                       | Precondition function (signature)                                            |
|------------------------------|-------------------------------------------------------------------------------|
| `submit_rfq`                 | `assertSubmitPreconditions(rfq)`  (§3.2)                                      |
| `assign_suppliers`           | `assertAssignable(payload.supplierIds)`                                       |
| `publish_rfq`                | `assertAtLeastOneSupplier(workspace) && assertFutureDeadline(workspace)`      |
| `extend_deadline`            | `assertDeadlineExtensionAllowed(workspace, payload.newDeadline)` (≤2× / ≤14d) |
| `reopen_quotations`          | `assertActorIsAdmin(actor) && assertNewDeadline(payload)`                     |
| `revise_rejected_rfq`        | `assertAtLeastOneFieldChanged(payload, rfq)`                                  |
| `select_supplier`            | `assertQuotationValid(payload.quotationId)`                                   |
| `cancel_rfq`                 | `assertReason(input.reason)`                                                  |

---

## §7. Admin RFQ Management

### 7.1 API
| Method | Path                                                | FSM action                       |
|--------|-----------------------------------------------------|----------------------------------|
| GET    | `/api/admin/rfq/queue`                              | (read-only, state=RFQ_SUBMITTED) |
| POST   | `/api/rfq/:id/actions/assign-suppliers`             | `assign_suppliers`               |
| POST   | `/api/rfq/:id/actions/add-suppliers`                | `add_more_suppliers`             |
| POST   | `/api/rfq/:id/actions/remove-supplier`              | `remove_supplier`                |
| POST   | `/api/rfq/:id/actions/reject`                       | `reject_rfq`                     |
| POST   | `/api/rfq/:id/actions/publish`                      | `publish_rfq`                    |

### 7.2 Admin Queue UI
- `/admin/rfq/queue` shows only `state=RFQ_SUBMITTED`
- Each row: external ref · buyer · created · category · CTA "Open & Triage"
- Triage drawer with two primary CTAs: "Assign Suppliers" or "Reject" (reason required)

---

## §8. Supplier Assignment

### 8.1 Supplier lookup API
| Method | Path                                       | Query                          | Returns |
|--------|--------------------------------------------|--------------------------------|---------|
| GET    | `/api/admin/suppliers`                     | `?q=&category=&country=`       | `SupplierLite[]` |

### 8.2 `AssignSuppliersDialog.tsx` (admin only)
- Multi-select with debounced search
- Shows previously-assigned supplier list (disabled, with "remove" icon)
- "Assign" calls `POST /api/rfq/:id/actions/assign-suppliers` with `{ supplierIds: [...] }`
- On success: optimistic UI update + toast + refetch

### 8.3 Side-effects (handled in `applyTransition`)
- Insert into `supplier_assignments` (N rows)
- Insert into `workspace_participants` (N rows, role `COUNTERPARTY`)
- Timeline event `rfq.suppliers.assigned` with `payload.supplierUserIds`
- Notifications: each assigned supplier + buyer (`INFO`)

---

## §9. Clarification Center

### 9.1 API
| Method | Path                                              | Body                                                      |
|--------|---------------------------------------------------|-----------------------------------------------------------|
| GET    | `/api/rfq/:id/clarifications`                     | —                                                          |
| POST   | `/api/rfq/:id/clarifications`                     | `{ message: string, replyToMessageId?: uuid }`             |
| POST   | `/api/rfq/:id/clarifications/:messageId/read`     | —                                                          |

### 9.2 Threading
Single thread per RFQ (Sprint 2 simplification). Messages can `replyTo` another message for visual nesting, but DB stores them flat with `parent_message_id`.

### 9.3 FSM integration
Every POST calls `applyTransition(workspaceId, "post_clarification", actor)`:
- State unchanged (self-loop)
- Timeline event `rfq.clarification.posted`
- Audit log entry
- Notification to the **other party** (BUYER → SUPPLIER+ADMIN; SUPPLIER → BUYER+ADMIN; ADMIN → BUYER+SUPPLIER per FSM §7)

### 9.4 UI
- Right-rail pane inside RFQ workspace tab
- WhatsApp-style bubbles, sender on right (own) / left (other)
- Composer at bottom with `Cmd+Enter` to send
- Read receipts via `clarification_messages.read_at`
- Unread badge on the Clarifications tab

---

## §10. Timeline System

### 10.1 API
| Method | Path                                  | Query                                |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/rfq/:id/timeline`               | `?cursor&limit (default 50, max 200)` |

### 10.2 Render rules
- Newest first.
- Grouping: events by same actor within 5 minutes merge into one card.
- Each event rendered via `eventRenderers[event_type]` — explicit map; unknown event_type falls back to neutral "An event occurred".
- Hovering on a row shows actor avatar + role badge + raw payload JSON in tooltip (admin only).

### 10.3 Append rule
**Only `applyTransition()` writes `timeline_events`.** A periodic test scans repo for direct `prisma.timelineEvent.create(` calls outside the FSM module and fails CI if found.

---

## §11. Notification System

### 11.1 Sprint 1 framework reused (notifications table + bell + page + socket).

### 11.2 Sprint 2 additions
- `notifications.workspace_id` (uuid, nullable for system-wide ones) — used for deep-link
- `notifications.event_type` (string) — mirrors timeline event
- `notifications.link` populated to `/workspace/rfq/:id?tab=…` per event-type table

### 11.3 Recipient resolver
```ts
function resolveRecipients(transition: RfqTransition, ws: WorkspaceFull, actor: User): RecipientSpec[] {
  // returns an array of:
  //   { kind: "user", userId }
  //   { kind: "role-broadcast", role: "ADMIN" }
  //   { kind: "workspace-participants", excludeActor: true, filter?: (p) => boolean }
}
```
Map per transition lives in `apps/backend/src/modules/rfq/rfq.notifications.ts` and is **derived from `RFQ_TRANSITIONS[].notifyRecipients`**.

### 11.4 Delivery
After commit:
1. Insert N `notifications` rows in batch.
2. For each row, emit `notification:new` to its target room.
3. Bell badge increments on the client via `useNotificationStore.increment()` listener.

---

## §12. Next Action Engine

### 12.1 Pure function
```ts
// packages/contracts/src/rfq.next-actions.ts
export interface NextAction {
  action: RfqAction;
  label: string;
  description: string;
  variant: "primary" | "secondary" | "destructive";
  requiresReason: boolean;
  confirmation?: string;
}

export function computeRfqNextActions(input: {
  state: RfqState;
  actorRole: Role;
  isOwner: boolean;
  isCounterparty: boolean;
  isSelectedSupplier?: boolean;     // for proforma-related actions
}): NextAction[];
```

### 12.2 Examples (derived, not hardcoded)

| State              | Actor=BUYER (owner)                | Actor=ADMIN                                      | Actor=SUPPLIER (counterparty) |
|--------------------|------------------------------------|--------------------------------------------------|-------------------------------|
| RFQ_DRAFT          | Submit · Cancel                    | —                                                | —                             |
| RFQ_SUBMITTED      | Withdraw                            | Assign Suppliers · Reject                        | —                             |
| SUPPLIERS_ASSIGNED | Cancel                              | Publish · Add/Remove Suppliers · Cancel          | —                             |
| RFQ_OPEN           | Extend Deadline · Close Early · Cancel | Extend Deadline · Cancel                       | Submit/Revise/Withdraw Quotation |
| QUOTATIONS_CLOSED  | Start Evaluation · Cancel           | Reopen Quotations · Cancel                       | —                             |
| UNDER_EVALUATION   | Select Supplier · Close w/o Award · Cancel | Cancel                                  | —                             |
| SUPPLIER_SELECTED  | Request Proforma · Revert           | —                                                | —                             |
| PROFORMA_REQUESTED | Cancel                              | Cancel                                            | Submit Proforma · Decline     |
| REJECTED_BY_ADMIN  | Revise Rejected RFQ                 | —                                                | —                             |

> All rows derived programmatically from `RFQ_TRANSITIONS` + permission matrix. Hardcoding any row above in JSX is a Sprint 2 defect.

### 12.3 UI rendering
```tsx
// RfqNextActions.tsx
const actions = computeRfqNextActions({ state, actorRole: user.role, isOwner, isCounterparty });
return (
  <div className="dmx-card p-5">
    <h3 className="dmx-label mb-3">Next Actions</h3>
    {actions.length === 0 ? <EmptyState /> : actions.map(a => <ActionButton key={a.action} {...a} />)}
  </div>
);
```

---

## §13. Audit Log System

### 13.1 Table
`audit_logs` is **append-only**. No `UPDATE` or `DELETE` queries allowed (enforced by `REVOKE` at DB level in Sprint 2.5).

```prisma
model AuditLog {
  id              String   @id @default(uuid()) @db.Uuid
  workspaceId     String   @map("workspace_id") @db.Uuid
  actorUserId     String   @map("actor_user_id") @db.Uuid
  actorEmail      String   @map("actor_email")             // snapshot
  actorRole       String   @map("actor_role")              // snapshot
  action          String                                    // RfqAction
  fromState       String?  @map("from_state")
  toState         String   @map("to_state")
  reason          String?
  payload         Json     @default("{}")
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @map("user_agent")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([workspaceId, createdAt])
  @@index([actorUserId, createdAt])
  @@map("audit_logs")
}
```

### 13.2 Diff vs `timeline_events`
| Aspect       | `timeline_events`                       | `audit_logs`                                   |
|--------------|------------------------------------------|------------------------------------------------|
| Purpose      | User-facing chronological history        | Security/compliance forensic trail             |
| Audience     | All workspace participants               | ADMIN + auditors only                          |
| Mutability   | Append-only by convention                | Append-only by DB grant                        |
| Payload      | UI-friendly (lot numbers, supplier names)| Raw input (IPs, headers, all fields)           |
| Retention    | Forever (workspace lifetime)             | Forever + offsite backup (Sprint 2.5)          |

Both written in the same transaction inside `applyTransition()`.

---

## §14. Socket.io Events

### 14.1 Event catalogue
| Event name                  | Room                  | Payload                            |
|-----------------------------|------------------------|------------------------------------|
| `rfq.state.changed`         | `workspace:{id}`       | `{ workspaceId, from, to, action, actorUserId }` |
| `rfq.timeline.appended`     | `workspace:{id}`       | `{ workspaceId, event: TimelineEvent }` |
| `rfq.clarification.posted`  | `workspace:{id}`       | `{ workspaceId, messageId, authorUserId }` |
| `rfq.participants.changed`  | `workspace:{id}`       | `{ workspaceId, added: [...], removed: [...] }` |
| `notification:new`          | `user:{id}` / `role:{r}` | `Notification`                   |

### 14.2 Server emission rules
- Emission happens **after** transaction commit (post-commit hook).
- Failure to emit logged but does **not** roll back the transition.
- Idempotency: client filters by `event.id` to drop duplicates within 60s.

### 14.3 Client subscription
```ts
const sock = useSocket();
sock.emit("workspace:subscribe", workspaceId);
sock.on("rfq.state.changed", (p) => qc.invalidateQueries(["rfq", workspaceId]));
sock.on("rfq.timeline.appended", (p) => qc.setQueryData(["rfq", workspaceId, "timeline"], (prev) => [p.event, ...prev]));
sock.on("notification:new", (n) => notificationStore.add(n));
```

---

## §15. UI Requirements (Sprint 2-specific deltas)

Sprint 1 design tokens (white bg, navy primary, soft shadows, Outfit/Inter, rounded cards) **remain**. Sprint 2 additions:

- **Red CTA accent** (per Sprint 2 prompt): destructive/terminal actions (Cancel, Reject) use `bg-red-600 text-white hover:bg-red-700`. Constructive primary still `bg-zinc-950 text-white`. Navy accent (`#1e3a8a` / `blue-900`) reserved for **state badges** on active workspaces and progress-bar fill.
- **State badges:** colored chip with dot indicator, mapped from RfqState (DRAFT=zinc, SUBMITTED=blue, ASSIGNED=indigo, OPEN=emerald, CLOSED=amber, EVALUATION=violet, SELECTED=cyan, PROFORMA=fuchsia, PO_ISSUED=teal, REJECTED/CANCELLED/EXPIRED=red, CLOSED_NO_AWARD=zinc).
- **Progress bar:** 7-step pill row with current step filled navy, prior steps green-checkmark, future steps grey-empty.
- **Empty states:** illustrated icon + 1-line copy + 1 primary CTA. No marketplace tropes (no "Browse 1000+ suppliers" banners).
- **Tables:** zebra-striped at `bg-zinc-50/50`, sticky header on scroll, columns left-aligned except dates/amounts which are right-aligned monospace.

---

## §16. Testing Plan

### 16.1 Layers
| Layer    | Tooling               | Coverage target                            |
|----------|------------------------|--------------------------------------------|
| Unit     | Vitest                 | `computeRfqNextActions`, recipient resolver, precondition validators — 100% |
| FSM      | Vitest                 | every transition in `RFQ_TRANSITIONS` has ≥1 positive + ≥1 negative test |
| Permission | Vitest + supertest   | every (state, action, role) tuple covered  |
| API      | Vitest + supertest     | every endpoint has happy-path + 401/403/422/409 cases |
| Notification | Vitest             | every transition triggers correct recipients |
| Timeline | Vitest                 | append-only invariant; rebuild-state replay |
| E2E      | Playwright             | Buyer creates RFQ → Admin assigns → Publishes → Supplier sees |

### 16.2 Mandatory FSM regression test
```ts
test("every transition in RFQ_TRANSITIONS has at least one positive test", () => {
  const tested = new Set(/* collected via __TESTED_TRANSITIONS__ helper */);
  for (const t of RFQ_TRANSITIONS) expect(tested).toContain(`${t.from}::${t.action}`);
});
```

### 16.3 No-bypass test (critical)
```ts
test("state mutation outside applyTransition is impossible", async () => {
  await expect(
    prisma.workspace.update({ where: { id }, data: { state: "PO_ISSUED" } })
  ).rejects.toThrow();   // enforced by Postgres trigger added in §17
});
```

PostgreSQL trigger (Sprint 2 migration):
```sql
CREATE OR REPLACE FUNCTION block_direct_state_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.fsm_authorised', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'workspaces.state can only be changed via applyTransition()';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_state_guard
  BEFORE UPDATE OF state ON workspaces
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION block_direct_state_change();
```
`applyTransition()` calls `SET LOCAL app.fsm_authorised = 'true'` inside its transaction.

---

## §17. Folder Structure (Sprint 2 deltas)

```
demaxtore/
├── packages/
│   └── contracts/
│       └── src/
│           ├── rfq.fsm.ts                  # ← reference file (§ref/rfq.fsm.ts)
│           ├── rfq.events.ts               # zod payload schemas
│           ├── rfq.next-actions.ts         # pure function
│           ├── rfq.zod.ts                  # input/output zod schemas
│           └── rfq.types.ts                # re-exports
│
├── apps/backend/
│   ├── prisma/
│   │   ├── schema.prisma                   # patched per §2 / reference file
│   │   ├── seed-sprint2.ts                 # demo suppliers + sample RFQ
│   │   └── migrations/
│   │       └── 20260301_sprint2_rfq_workflow/
│   │           ├── migration.sql           # new tables + state trigger
│   │           └── README.md
│   └── src/modules/rfq/
│       ├── rfq.routes.ts                   # ← reference file
│       ├── rfq.controller.ts
│       ├── rfq.service.ts                  # ← reference file (contains applyTransition)
│       ├── rfq.policy.ts                   # participant-based authz
│       ├── rfq.notifications.ts            # recipient resolver
│       ├── rfq.preconditions.ts            # per-action validator map
│       └── __tests__/
│           ├── rfq.fsm.spec.ts             # transition coverage
│           ├── rfq.api.spec.ts             # supertest
│           └── rfq.permissions.spec.ts
│
└── apps/frontend/src/features/rfq/
    ├── pages/                              # see §1.4
    ├── components/
    ├── hooks/
    └── lib/
```

---

## §18. API Contracts (complete REST + Socket catalogue)

### 18.1 REST endpoints (Sprint 2 additions)

| Method | Path                                                   | Guard         | FSM action                       |
|--------|--------------------------------------------------------|---------------|----------------------------------|
| POST   | `/api/rfq`                                             | BUYER         | `create_rfq`                     |
| GET    | `/api/rfq`                                             | any auth      | (list, role-scoped)              |
| GET    | `/api/rfq/:id`                                         | participant + policy | (read)                    |
| PATCH  | `/api/rfq/:id/draft`                                   | BUYER OWNER   | `edit_rfq_draft`                 |
| POST   | `/api/rfq/:id/actions/submit`                          | BUYER OWNER   | `submit_rfq`                     |
| POST   | `/api/rfq/:id/actions/withdraw`                        | BUYER OWNER   | `withdraw_rfq`                   |
| POST   | `/api/rfq/:id/actions/assign-suppliers`                | ADMIN         | `assign_suppliers`               |
| POST   | `/api/rfq/:id/actions/add-suppliers`                   | ADMIN         | `add_more_suppliers`             |
| POST   | `/api/rfq/:id/actions/remove-supplier`                 | ADMIN         | `remove_supplier`                |
| POST   | `/api/rfq/:id/actions/reject`                          | ADMIN         | `reject_rfq`                     |
| POST   | `/api/rfq/:id/actions/publish`                         | ADMIN         | `publish_rfq`                    |
| POST   | `/api/rfq/:id/actions/revise-rejected`                 | BUYER OWNER   | `revise_rejected_rfq`            |
| POST   | `/api/rfq/:id/actions/extend-deadline`                 | BUYER/ADMIN   | `extend_deadline`                |
| POST   | `/api/rfq/:id/actions/close-quotations`                | BUYER OWNER   | `close_quotations_early`         |
| POST   | `/api/rfq/:id/actions/reopen-quotations`               | ADMIN         | `reopen_quotations`              |
| POST   | `/api/rfq/:id/actions/start-evaluation`                | BUYER OWNER   | `start_evaluation`               |
| POST   | `/api/rfq/:id/actions/select-supplier`                 | BUYER OWNER   | `select_supplier`                |
| POST   | `/api/rfq/:id/actions/revert-selection`                | BUYER OWNER   | `revert_selection`               |
| POST   | `/api/rfq/:id/actions/close-without-award`             | BUYER OWNER   | `close_without_award`            |
| POST   | `/api/rfq/:id/actions/cancel`                          | BUYER/ADMIN   | `cancel_rfq`                     |
| GET    | `/api/rfq/:id/timeline`                                | participant   | (read)                           |
| GET    | `/api/rfq/:id/clarifications`                          | participant   | (read)                           |
| POST   | `/api/rfq/:id/clarifications`                          | participant   | `post_clarification`             |
| GET    | `/api/admin/rfq/queue`                                 | ADMIN         | (read submitted)                 |
| GET    | `/api/admin/suppliers`                                 | ADMIN         | (lookup)                         |

> Proforma / PO actions exist in the FSM but their **endpoints are deferred to Sprint 2.5 or 3** (no real proforma upload module yet). Their `applyTransition` rules remain testable via direct service calls.

### 18.2 Socket.io rooms reused from Sprint 1; new events listed in §14.

---

## §19. Sprint 2 Definition of Done

A Sprint 2 build is "done" when **all** below are green:

1. ✅ All 40 RFQ transitions wired in `RFQ_TRANSITIONS` (sourced from FSM doc §3, no manual diff).
2. ✅ `applyTransition()` is the only function that updates `workspaces.state` — verified by Postgres trigger + grep test.
3. ✅ Every transition has ≥1 positive + ≥1 negative Vitest case.
4. ✅ Permission matrix (FSM §5) is enforced; ≥1 negative test per `(state × action × role)` deny rule.
5. ✅ Currency immutability post-publish (Decision #11): `PATCH /api/rfq/:id/draft { currency }` → 409 once state ≥ `RFQ_OPEN`.
6. ✅ Extend-deadline limits (Decision #5): 3rd extension → 409 `EXTEND_LIMIT_REACHED`; cumulative >14 days → 409 `EXTEND_DAYS_EXCEEDED`.
7. ✅ `revise_rejected_rfq` (Decision #6) returns RFQ to `RFQ_DRAFT` with timeline event `rfq.revised_from_rejection`.
8. ✅ `reopen_quotations` (Decision #4) callable only by ADMIN; BUYER call → 403.
9. ✅ Notification recipient list per transition matches FSM §7 trigger table exactly.
10. ✅ Socket.io `workspace:{id}` room: state changes + timeline append + clarification arrive in real-time to all participants.
11. ✅ Next Action Engine outputs derived from `RFQ_TRANSITIONS`; no hardcoded UI buttons.
12. ✅ Audit log records every transition with actor snapshot (email + role at write time).
13. ✅ Playwright E2E: Buyer creates RFQ → Admin assigns 2 suppliers → publishes → both suppliers see it in their list → 1 supplier posts clarification → all participants see the timeline update in real time.
14. ✅ `pnpm prisma migrate deploy` succeeds on fresh Postgres 16; `pnpm prisma db seed-sprint2` produces 3 demo suppliers + 1 RFQ in `RFQ_OPEN`.
15. ✅ `pnpm -r build` zero errors; `pnpm -r test` zero failures.

### Out-of-scope reminders (NOT in Sprint 2 DoD)
CommodityBid · Order · PO Management · Real proforma upload · FreightIQ · Inspection · Shipment · Email delivery · RLS policies · Anti-sniping · Multi-round bidding · Split award · Supplier ratings.

---

## §20. Reference code map

| File                                                                 | Purpose                                                |
|----------------------------------------------------------------------|--------------------------------------------------------|
| `./sprint-2-reference-code/rfq.fsm.ts`                               | Full `RFQ_TRANSITIONS` array — 40 entries              |
| `./sprint-2-reference-code/prisma-sprint2-rfq.prisma`                | Schema additions + workspaces deltas                   |
| `./sprint-2-reference-code/rfq.service.ts`                           | `applyTransition()` reference implementation           |
| `./sprint-2-reference-code/rfq.next-actions.ts`                      | `computeRfqNextActions()` pure function                |
| `./sprint-2-reference-code/rfq.zod.ts`                               | Input/output zod schemas                               |
| `./sprint-2-reference-code/migrations/state-guard-trigger.sql`       | Postgres trigger blocking direct state mutation        |

The remaining ~25 files (routes, controllers, React pages, tests) follow the contracts above mechanically; can be generated by Cursor / Opus once these contract files exist.

---

*End of Sprint 2 Implementation Plan. Stack lock + FSM compliance are non-negotiable.*
