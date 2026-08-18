# Sprint 3C — Architecture Report

**Sprint:** Shipment Runtime Foundation  
**Date:** 2026-06-03  
**Prerequisite:** [Architecture Delta Report](./sprint-3c-architecture-delta-report.md)

---

## 1. Objective

Introduce a dedicated **Shipment Workspace** spawned from Order at `FREIGHT_REQUESTED`, without modifying RFQ, CommodityBid, or Order FSM contract files.

```
RFQ → PO → ORDER_CREATED → Order Lifecycle → FREIGHT_REQUESTED
  → Shipment Workspace (SHIPMENT_CREATED) → Shipment Lifecycle → COMPLETED
```

---

## 2. Layer map

| Layer | Artifacts |
|-------|-----------|
| **Contracts** | `shipment.fsm.ts`, `shipment.zod.ts`, `shipment.next-actions.ts`, `shipment.fsm.test.ts` |
| **Database** | `shipment_workspaces`, `shipment_documents`, `shipment_status_updates`, `shipment_exceptions`; `WorkspaceType.SHIPMENT` |
| **Backend** | `apps/backend/src/modules/shipment/*`, `/api/shipments` |
| **Spawn** | `shipment.spawn.ts` via Order side-effect on `skip_inspection` / `proceed_to_freight` |
| **Frontend** | `ShipmentWorkspacePage` at `/workspace/shipment/:id` |
| **Realtime** | `shipment.updated`, `shipment.timeline.appended`, `shipment.state.changed`, `shipment.exception.*` |

---

## 3. FSM summary

**16 states:** `SHIPMENT_CREATED` through `COMPLETED`, plus `CANCELLED`, `EXCEPTION`.

**Gateway:** All mutations via `ShipmentService.applyTransition()` with `SET LOCAL app.fsm_authorised = 'true'` (state-guard compatible).

**Coexistence:** Order FSM freight states (`SHIPMENT_BOOKED` … `CLOSED`) remain for 3B regression; Shipment owns port-to-port detail.

---

## 4. Spawn protocol

| Trigger | Order actions | Result |
|---------|---------------|--------|
| Entry to `FREIGHT_REQUESTED` | `skip_inspection`, `proceed_to_freight` | `spawnShipmentFromOrder()` |

- External ref: `SHP-{orderExternalRef}` (idempotent)
- Participants: buyer OWNER, supplier COUNTERPARTY (reuses `workspace_participants`)
- Parent timeline: `shipment.spawned`
- Child timeline: `shipment.created`

---

## 5. API surface

| Method | Path |
|--------|------|
| GET | `/api/shipments/:id` |
| GET | `/api/shipments/:id/timeline` |
| GET | `/api/shipments/:id/documents` |
| GET | `/api/shipments/:id/documents/:docId` |
| POST | `/api/shipments/:id/documents` (multipart) |
| GET | `/api/shipments/:id/exceptions` |
| GET | `/api/shipments/:id/next-actions` |
| POST | `/api/shipments/:id/actions/*` |
| GET | `/api/orders/:id/spawned-shipments` |

---

## 6. Constraints honoured

- No RFQ / CommodityBid / Order FSM file edits
- No GPS, maps, carrier APIs, FreightIQ Phase 2
- No refactor of existing runtimes
- Single mutation gateway + audit + timeline + notifications + sockets
