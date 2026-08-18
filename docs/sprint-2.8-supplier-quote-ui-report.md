# Sprint 2.8 — Supplier Quotation UI Form

**Status:** ✅ Complete
**Date:** 2026-06-03
**Scope:** Build the supplier-facing UI form for submit / revise / withdraw — no new backend, no FSM changes.

---

## What was delivered

A self-contained `<SupplierQuoteForm>` component that mounts on the workspace
page **only when**:

- current user has role `SUPPLIER`, AND
- they are a `COUNTERPARTY` of the workspace, AND
- workspace state is `RFQ_OPEN`.

Two modes:

| Mode | Trigger | Action buttons | Endpoint |
|---|---|---|---|
| **compose** | no quotation yet, OR last action was withdraw | **Submit quotation** | `POST /api/rfq/:id/quotations` |
| **review**  | active quotation (SUBMITTED / REVISED) exists | **Submit revision** + **Withdraw quotation** | `PATCH /api/rfq/:id/quotations/:qid` and `DELETE /api/rfq/:id/quotations/:qid` |

### Form features

- Pre-fills line items from the RFQ's line items (description + quantity locked in).
- **Live grand total** computed in `tabular-nums font-mono` as the supplier types (`quantity × unit_price` per row, summed).
- Inline validation banner: "Ready to submit" ✓ when valid, otherwise human-readable error (`Line 2: quantity must be > 0`, etc.) above the action buttons.
- Aux fields: lead-time, MOQ, payment-terms (all optional).
- "Add line" / per-row trash button.
- Status badge in the header (SUBMITTED amber-emerald / REVISED amber) once a quotation exists.
- Withdraw flow: modal with required-reason textarea (≥ 3 chars), destructive button.
- Success / error toasts on every action (`Quotation submitted • Total 4250.00 USD`, etc.).
- Re-submit after withdraw: form resets and goes back to compose mode (backend reactivates the existing row via the unique-slot logic we built in Sprint 2.7).

### Tiny backend extension

To compute `isCounterparty` correctly on the frontend, the workspace DTO at
`GET /api/rfq/:id` now includes a `participants[]` array. This is the single
backend change in Sprint 2.8 — no new endpoint.

---

## Verification

### Real-browser session (Playwright + screenshot)
```
✓ supplier-quote-form visible             (mounts under correct conditions)
✓ Line 1 unit-price 42.50 + Line 2 30.00  →  live total 5750.00 USD
✓ POST /quotations                         → 201
✓ status badge flips to "SUBMITTED"; revise + withdraw buttons appear
✓ Line 1 unit-price → 39.90                →  live total 5490.00 USD
✓ PATCH /quotations/:qid                  → 200
✓ status badge flips to "REVISED"
✓ DELETE /quotations/:qid (with reason)   → 200
✓ "Quotation withdrawn" toast
```

### Playwright suite (15/15 green)
```
✓ 01-auth.spec.ts                                                    (4)
✓ 02-rfq-flow.spec.ts › 01  Buyer creates RFQ via UI
✓ 02-rfq-flow.spec.ts › 02  Workspace renders timeline + next-actions
✓ 02-rfq-flow.spec.ts › 03  Admin assigns + publishes via UI drawer
✓ 02-rfq-flow.spec.ts › 04  Supplier sees published RFQ in list
✓ 02-rfq-flow.spec.ts › 05  Supplier submits via UI form, revises via UI, buyer compares  ← NEW
✓ 02-rfq-flow.spec.ts › 06  Buyer selects REAL quotation via picker
✓ 02-rfq-flow.spec.ts › 07  Buyer requests proforma
✓ 02-rfq-flow.spec.ts › 08  Supplier uploads proforma + transition
✓ 02-rfq-flow.spec.ts › 09  Buyer issues PO via picker  →  PO_ISSUED
✓ 03-realtime-and-isolation.spec.ts                                  (2)

15 passed (47.9s)
```

Test 05 now drives **every** step through the UI: form interaction, button clicks, status badge assertion, live total verification. The fetched comparison endpoint reads back the supplier's real data.

---

## File map (Sprint 2.8 — created / modified)

```
apps/frontend/
└── src/features/rfq/
    ├── components/
    │   └── SupplierQuoteForm.tsx                + new — full form (compose + review modes)
    └── pages/
        └── RfqWorkspacePage.tsx                 ✎ mounts SupplierQuoteForm when conditions hold

apps/backend/
└── src/modules/rfq/
    └── rfq.service.read.ts                      ✎ DTO now exposes `participants[]`

apps/e2e/
└── tests/02-rfq-flow.spec.ts                    ✎ Test 05 rewritten to drive the UI form
                                                   (clicks, fills, status badge, live total)

docs/sprint-2.8-supplier-quote-ui-report.md      + this file
```

`tsc --noEmit` (backend): 0 errors.

---

## What's deliberately untouched

- ❌ No new endpoints (only DTO field added).
- ❌ No FSM changes.
- ❌ No CommodityBid / Order Workspace work.
- ❌ Email delivery still deferred — that's the next sprint.

---

## What's next

Per your roadmap:

1. ~~Supplier Quotation UI Form~~ ✅ done
2. **Messaging & Delivery Sprint** — Resend / SMTP, forgot-password mail, SLA reminder cron, notification email fallback
3. Sprint 3 — CommodityBid Runtime

I'll wait for your green light on (2).
