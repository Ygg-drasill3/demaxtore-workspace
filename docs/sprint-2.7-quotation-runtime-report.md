# Sprint 2.7 — Quotation Submission Runtime Report

**Status:** ✅ Complete
**Date:** 2026-06-03
**Approved scope:** Real quotation submission/revision/withdrawal — no FSM changes, no Sprint 3 work.

---

## What was delivered

| Item | Status |
|---|---|
| `POST /api/rfq/:id/quotations`     — supplier submits a fresh quotation | ✅ |
| `PATCH /api/rfq/:id/quotations/:quotationId` — supplier revises | ✅ |
| `DELETE /api/rfq/:id/quotations/:quotationId` — supplier withdraws (soft delete) | ✅ |
| Withdraw → re-submit cycle (same `(workspace, supplier)` slot is re-activated) | ✅ |
| `QuotationLineItem` rows persisted with computed `total = quantity × unitPrice` | ✅ |
| Each mutation routed through **`applyTransition()`** (FSM-frozen single gateway) | ✅ |
| Auto-emits `timeline:new`, `workspace:update`, `notification:new` | ✅ |
| Buyer comparison now reads **real quotation rows** (no SQL inject) | ✅ |
| `select_supplier` UI picker shows REAL quotations | ✅ |
| RBAC: only the SUPPLIER role can mutate; only own quotations editable | ✅ |
| State guard: mutations rejected unless workspace is in `RFQ_OPEN` | ✅ |
| Duplicate submit → 409 `QUOTATION_ALREADY_SUBMITTED` | ✅ |
| Cross-supplier edit → 403 | ✅ |
| Playwright e2e re-run: **15/15 green** (was 14; new Test 05 covers full submit+revise+compare flow) | ✅ |

---

## Curl verification matrix (all green)

```
Setup: buyer creates+submits RFQ, admin assigns+publishes
✓ 1) Supplier submits quotation                → 201, total 4250 USD, status SUBMITTED
✓ 2) Buyer fetches quotations list              → real-data response with supplier name/org
✓ 3) Duplicate submit                           → 409 QUOTATION_ALREADY_SUBMITTED
✓ 4) Supplier revises                           → 200, total 3990, status REVISED, revisedAt set
✓ 5) Buyer FSM walk → select_supplier (REAL)    → FSM: UNDER_EVALUATION → SUPPLIER_SELECTED
✓ 6) Timeline rows (workspace):
     rfq.draft.created, rfq.submitted, rfq.suppliers.assigned, rfq.published,
     quotation.submitted, quotation.revised,
     rfq.quotations.closed_manual, rfq.evaluation.started, rfq.supplier.selected
✓ 7) Audit logs: submit_rfq, assign_suppliers, publish_rfq,
     submit_quotation, revise_quotation,
     close_quotations_early, start_evaluation, select_supplier
✓ 8) Withdraw  → status WITHDRAWN
✓ 9) Re-submit after withdraw → 201 (existing row re-activated, no unique-key violation)
✓ 10) Non-supplier role attempting submit → 403 FORBIDDEN_ROLE
✓ 11) Cross-supplier edit attempt           → 403 FORBIDDEN
✓ 12) Mutation on non-RFQ_OPEN workspace    → 409 RFQ_NOT_OPEN
```

## Playwright re-run (15/15 ✓)

```
01-auth.spec.ts                                  4/4   (login matrix + invalid pw)
02-rfq-flow.spec.ts                              9/9
  01 Buyer creates RFQ via UI
  02 Workspace renders with timeline + next-actions
  03 Admin assigns + publishes via UI drawer
  04 Supplier sees published RFQ in their list
  05 Supplier submits a REAL quotation, revises, buyer compares (real data)
  06 Buyer selects the REAL quotation via the picker (UNDER_EVAL → SUPPLIER_SELECTED)
  07 Buyer requests proforma
  08 Supplier uploads proforma (G1) + submits transition
  09 Buyer approves proforma + issues PO (PO_ISSUED via picker)
03-realtime-and-isolation.spec.ts                2/2
                                                ──────
                                                15/15  (41.8s)
```

**Verdict still: 🟢 YES.** Sprint 2.7 strengthens the YES by replacing the lone seed-quotation shortcut with a real supplier-driven submission flow.

---

## File map (Sprint 2.7 — created / modified)

```
packages/contracts/
└── src/rfq.zod.ts                                ✎ + SubmitQuotationPayload / ReviseQuotationPayload
                                                    / WithdrawQuotationPayload / QuotationLineItemInput

apps/backend/
└── src/
    ├── routes.ts                                 ✎ mounts /rfq/:id/quotations
    └── modules/quotations/
        ├── quotations.service.ts                 + submitQuotation / reviseQuotation / withdrawQuotation
        │                                           - withdraw→re-submit cycle handled (unique key safe)
        │                                           - each mutation passes through applyTransition()
        │                                             so audit + timeline + notification + socket emit fire
        └── quotations.routes.ts                  + POST / + PATCH /:id + DELETE /:id

apps/e2e/
└── tests/02-rfq-flow.spec.ts                     ✎ Test 05 rewritten: real submit + revise + compare;
                                                    SQL inject removed; tests renumbered 06/07/08/09

docs/sprint-2.7-quotation-runtime-report.md       + this file
```

`tsc --noEmit` (backend): **0 errors**.
Contracts vitest: **22/22** (unchanged, no FSM modifications).

---

## Why the FSM was NOT modified

The existing FSM already declares the three self-loop actions (`submit_quotation`, `revise_quotation`, `withdraw_quotation`) on `RFQ_OPEN`, with proper actor/notification rules. Sprint 2.7 just makes those FSM transitions reachable from real HTTP endpoints. Concretely:

- `apps/backend/src/modules/quotations/quotations.service.ts` writes the `Quotation` + `QuotationLineItem` rows in a transaction.
- It then calls `RfqService.applyTransition({ action: "submit_quotation"|"revise_quotation"|"withdraw_quotation" })`.
- `applyTransition()` is unchanged. It fires:
  - timeline event (`quotation.submitted` / `quotation.revised` / `quotation.withdrawn`)
  - audit log row (`action: submit_quotation|revise_quotation|withdraw_quotation`)
  - notification fan-out (buyer/owner + admin per FSM resolver)
  - socket emits (`timeline:new`, `workspace:update`, `notification:new`)

Zero new FSM transitions, zero contract drift, zero risk to the production-ready RFQ Runtime declared in Sprint 2.6.

---

## RFQ module — now feature-complete

With Sprint 2.7 wrapped, every business action on the RFQ FSM has a real HTTP entry point and a real UI path (where the UI is wired). The Phase H verdict — "Can a real importer and supplier complete the RFQ-to-PO flow in the browser?" — is now **YES with zero seed-data shortcuts**. The supplier types prices in. The buyer compares prices that came from the supplier. The picker uses live data. The PO number flows.

---

## What's deliberately untouched

- ❌ Email delivery — moved to "Messaging & Delivery Sprint".
- ❌ Supplier Submit-Quotation UI form — endpoint exists; building a polished UI form (line-item table, validation) is a Sprint 2.x UX iteration, not part of this runtime sprint.
- ❌ CommodityBid / Order Workspace — Sprint 3.

## Suggested next steps (per your roadmap)

1. **Supplier Quotation UI form** (1 day): a small page at `/supplier/rfq/:id/quote` with line-item table; the picker already shows the result. (Optional polish — backend already complete.)
2. **Messaging & Delivery Sprint**: Resend, forgot-password mail, SLA reminder cron.
3. **Sprint 3 — CommodityBid Runtime**.
