# Sprint 5D — PO Management Report

## Objective

Transform Purchase Order handling from a single RFQ FSM transition side effect into a first-class operational entity with workspace, acknowledgements, amendments, revision history, order linkage, Control Tower alerts, realtime events, and audit.

## Delivered

### Domain & contracts

- `packages/contracts/src/purchase-order.ts` — statuses, actions, DTOs
- `packages/contracts/src/purchase-order.zod.ts` — validation (PO number, lines, amendment/revision reasons)
- `packages/contracts/src/purchase-order.test.ts`
- Control Tower keys: `po_no_acknowledgement_72h`, `po_amendment_open_72h`, `po_cancelled`, `po_rejected`
- Socket events: `po.issued`, `po.acknowledged`, `po.amendment.*`, `po.closed`

### Database

- Tables: `purchase_orders`, `purchase_order_lines`, `purchase_order_revisions`, `purchase_order_acknowledgements`, `purchase_order_amendments`
- Migration: `20260615120000_sprint5d_po_management`

### Backend

- Module: `apps/backend/src/modules/purchase-order/`
- Single mutation gateway: `applyPoAction()` with actions `acknowledge_po`, `request_amendment`, `approve_amendment`, `reject_amendment`, `close_po`, `cancel_po` (`issue_po` remains on RFQ/CommodityBid spawn path)
- Spawn hook: `createPurchaseOrderOnOrderSpawn()` after `spawnOrderWorkspace()` in RFQ `issue_po` and CommodityBid `issue_contracts` (additive; spawn chains unchanged)
- Routes: `GET/POST /api/purchase-orders/*`, `GET /api/orders/:id/purchase-order`
- Alert scan: `scanPurchaseOrderAlerts()` wired into Control Tower `AlertEngine`

### Frontend

- PO workspace: `/workspace/po/:id`
- Order PO summary panel on Order workspace
- PO overview widget on Operations (admin)

## Out of scope (unchanged)

Accounting, ERP, invoicing, payments, banking, e-signature, tax, financial reconciliation.

## FSMs not modified

RFQ, CommodityBid, Order, Shipment FSMs; FreightIQ; Trade Documents; maritime tracking core.
