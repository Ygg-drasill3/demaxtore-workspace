# Sprint 3C — Architecture Delta Report

**Date:** 2026-06-03  
**Prerequisite:** Sprint 3B complete (Order Runtime YES)  
**Constraint:** RFQ / CommodityBid / Order **FSM files unchanged**

---

## 1. Current state (3B baseline)

| Layer | What exists |
|-------|-------------|
| **Order FSM** | Freight embedded in Order: `FREIGHT_REQUESTED` → `SHIPMENT_BOOKED` → `DEPARTED` → `IN_TRANSIT` → `ARRIVED_PORT` → `DELIVERED` → `CLOSED` |
| **Order spawn** | `order.spawn.ts` from RFQ `issue_po` / CommodityBid `issue_contracts` |
| **Order tables** | `order_workspaces`, `order_documents`, `order_status_updates` |
| **Workspace** | `WorkspaceType`: `RFQ` \| `COMMODITYBID` \| `ORDER` only |
| **Spawn graph** | `workspaces.spawned_from_id` self-relation |
| **Patterns** | `applyTransition()`, `state-guard-trigger`, `socketBus`, `withRlsUser` (CB only) |

Order reaches `FREIGHT_REQUESTED` via existing actions (no FSM change needed):

- `skip_inspection` (PRODUCTION_COMPLETED → FREIGHT_REQUESTED)
- `proceed_to_freight` (INSPECTION_COMPLETED → FREIGHT_REQUESTED)

---

## 2. Sprint 3C delta (what we add)

| Add | Purpose |
|-----|---------|
| `WorkspaceType.SHIPMENT` | New workspace kind |
| `shipment.fsm.ts` + zod + next-actions | 16 states, 15+ actions (separate lifecycle) |
| Prisma: `shipment_workspaces`, `shipment_documents`, `shipment_status_updates`, `shipment_exceptions` | Operational data |
| `modules/shipment/*` | Runtime module `/api/shipments` |
| `shipment.spawn.ts` | SYSTEM spawn from Order (side effect only) |
| Order `getSpawnedShipments` | List child shipments (read API) |
| `ShipmentWorkspacePage` | `/workspace/shipment/:id` |
| Socket events | `shipment.*` |
| E2E `06-shipment-flow.spec.ts` | Post–FREIGHT_REQUESTED path |

---

## 3. What we do NOT change

| Artifact | Reason |
|----------|--------|
| `packages/contracts/src/rfq.fsm.ts` | Master prompt forbid |
| `packages/contracts/src/commoditybid.fsm.ts` | Master prompt forbid |
| `packages/contracts/src/order.fsm.ts` | Master prompt forbid |
| Order E2E freight buttons | Regression must pass — Order freight states remain callable |

**Coexistence model:** Order FSM freight states stay for **3B regression**. Shipment workspace owns **detailed** port-to-port execution. Spawn fires once on entry to `FREIGHT_REQUESTED` without editing Order FSM.

---

## 4. Spawn integration (no Order FSM edit)

```
Order.applyTransition(proceed_to_freight | skip_inspection)
  → state = FREIGHT_REQUESTED (existing transition)
  → runActionSideEffects:
       spawnShipmentFromOrder(tx, orderWorkspace)  // NEW side effect only
         → Workspace type=SHIPMENT, state=SHIPMENT_CREATED
         → shipment_workspaces row
         → timeline shipment.created on child + shipment.spawned on parent
```

Idempotency: `SHP-{orderExternalRef}` unique `external_ref`.

---

## 5. Reuse matrix

| Capability | Reuse |
|----------|--------|
| `timeline_events` | Yes — per workspace |
| `audit_logs` | Yes |
| `notifications` | Yes — `shipment.notifications.ts` |
| `workspace_participants` | Yes — carry buyer OWNER, supplier COUNTERPARTY |
| Attachments | Pattern from `order.documents.routes` + `attachments.service` storage |
| Socket bus | `emitToWorkspace` + user channels |
| Auth/RBAC | `shipment.policy.ts` mirror order |

---

## 6. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Dual freight paths (Order vs Shipment) | Document; 3C E2E uses Shipment; Order E2E unchanged |
| `WorkspaceType` enum migration | `ALTER TYPE ... ADD VALUE 'SHIPMENT'` |
| State guard | Same trigger; Shipment uses `applyTransition` + SET LOCAL |
| 1:N shipments | Schema allows; spawn idempotent per order ref for 3C |

---

## 7. Implementation order (locked)

1. Contracts (`shipment.fsm.ts`, zod, next-actions, tests)  
2. Prisma migration `20260605120000_sprint3c_shipment`  
3. Backend module + routes  
4. Order side-effect spawn (no FSM file touch)  
5. Documents routes  
6. Frontend page  
7. Playwright `06-shipment-flow.spec.ts`  
8. Regression + verdict docs  

---

## 8. Approval to code

This report complete. Implementation proceeds per master prompt phases 1–10.
