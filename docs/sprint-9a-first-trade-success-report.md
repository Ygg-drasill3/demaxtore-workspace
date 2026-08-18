# Sprint 9A — First Trade Success Report

## Business Objective

Enable first-time buyers, suppliers, and operators to complete their first trade **without external training**.

## First Trade Journeys

### Buyer (6 steps)

1. Create RFQ
2. Receive quotation
3. Select supplier
4. Issue PO
5. Track shipment
6. Complete trade

### Supplier (5 steps)

1. Receive invitation
2. Submit offer
3. Accept order
4. Upload documents
5. Complete shipment

### Operator / ADMIN (4 steps)

1. Monitor order
2. Verify documents
3. Review shipment
4. Close process

## How Progress Is Derived

Progress is **not** stored as FSM states. The backend inspects:

- RFQ workspaces created / quotations / supplier selection / PO states
- Order and shipment workspace participation
- Trade document uploads and reviews
- Supplier activity logs (INVITED stage)

Results sync into `user_onboarding_progress` on each `GET /api/onboarding/progress` call.

## Guided UX Surfaces

| Surface | Purpose |
|---------|---------|
| `GuidedOnboardingCard` | Dashboard hero — progress %, next action, checklist |
| `WhatHappensNextCard` | RFQ workspace (existing, unchanged) |
| `WorkspaceGuidancePanel` | Generic workspace next-step from FSM engines |
| `TradeProgressBar` | RFQ → PO → Production → Shipment → Arrival → Documents → Completed |
| `ProductTour` | First-login orientation (dismissible) |

## First Trade Completion Criteria

| Role | `first_trade_completed` when |
|------|------------------------------|
| BUYER | Shipment delivered (`DELIVERED` / `COMPLETED`) |
| SUPPLIER | Shipment delivered on participant workspace |
| ADMIN | Order closed (`CLOSED`) |
