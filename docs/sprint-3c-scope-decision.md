# Sprint 3C — Scope Decision (Freight Execution Foundation)

**Recorded:** 2026-06-03  
**Prerequisite:** Product Readiness Audit v2 — core trade **YES**, overall **MOSTLY YES** with accepted operational debt  
**Discipline:** FSM → Runtime → UI → Playwright → Product Readiness Audit (same as RFQ / CommodityBid / Order)

---

## Objective

Connect **Order Workspace** to a **dedicated freight & shipment operations layer** — not a marketplace, not live tracking, not carrier APIs.

Today, freight lifecycle states (`FREIGHT_REQUESTED` → … → `ARRIVED_PORT`) live **inside Order FSM** (`docs/order-state-machine.md`). Sprint 3C should **operationalize** them as first-class shipment records while preserving workspace-centric architecture.

---

## In scope (Sprint 3C)

| Area | Intent |
|------|--------|
| **Freight Request** | Structured request from Order → ops queue |
| **Freight Booking** | Admin books carrier/FFW; links provider + shipment |
| **Freight Provider registry** | Reference data (forwarders, carriers — manual CRUD) |
| **Shipment records** | One port-to-port shipment per Order (Decision #1: no multi-leg) |
| **ETA management** | Append-only ETA history + current ETA (extends `order_eta_updates` pattern) |
| **Delay foundation** | Delay reason/category records; no auto-SLA engine required |
| **Exception foundation** | Exception records linked to shipment; triage metadata — not full Exception Center UI |
| **Shipment Timeline** | Reuse `timeline_events` (workspace-scoped) |
| **Shipment Documents** | B/L, booking confirmations — reuse attachment pattern |
| **Freight Next Actions** | FSM-driven; no hardcoded CTAs |

**Suggested deliverables (implementation phases):**

1. `shipment-state-machine.md` + `packages/contracts/src/shipment.fsm.ts`
2. Prisma: `freight_providers`, `shipments`, `shipment_eta_updates`, `shipment_delays`, `shipment_exceptions`
3. `apps/backend/src/modules/shipment/` — `applyTransition()` only
4. Spawn/link protocol: Order `FREIGHT_REQUESTED` / `proceed_to_freight` → Shipment workspace
5. `ShipmentWorkspacePage` (or Order-embedded shipment panel — decision in Master Prompt)
6. Playwright `06-shipment-flow.spec.ts` — browser-only post-booking path
7. `sprint-3c-freight-runtime-report.md` + regression green

---

## Out of scope (explicit)

- GPS / container IoT / devices
- Maps / live position
- Freight marketplace
- Freight rate comparison engine
- AI ETA prediction
- Carrier API integrations (Maersk, Flexport, etc.)
- FreightIQ branding as external product (internal ops only)
- Customs / last mile / truck pickup (Order Decision #1)

---

## Architectural constraints (carry forward)

- Do **not** modify RFQ or CommodityBid FSM
- Do **not** redesign Order production/inspection FSM without explicit approval
- Reuse: Auth, RBAC, `timeline_events`, `audit_logs`, `notifications`, Socket.io, Next Action engine, idempotency, `spawned_from_id`
- Single mutation gateway per workspace type: `applyTransition()`
- State guard trigger remains active

---

## Relationship to Order 3B

| Order state (3B) | Sprint 3C evolution |
|------------------|----------------------|
| `FREIGHT_REQUESTED` | May trigger Shipment spawn or hand off to Shipment module |
| `SHIPMENT_BOOKED` … `ARRIVED_PORT` | May mirror Shipment FSM states; Order stays summary/coordinator |
| `order_eta_updates` | May migrate to `shipment_eta_updates` or dual-write during transition |

**Open design question for Master Prompt:** Separate `SHIPMENT` workspace type vs. enrich Order with shipment sub-domain only. Recommendation: **separate Shipment workspace** spawned at freight handoff (consistent with RFQ→Order spawn pattern).

---

## Entry gate (unchanged)

| Control | Required |
|---------|----------|
| RFQ / CommodityBid / Order regression | PASS |
| Operational debt | Documented in `accepted-operational-debt.md` |
| Sprint 3C Master Prompt | Approved before coding |

---

## Next artifact

**`Sprint 3C Master Prompt`** — full implementation spec (mirror Sprint 3B format: phases, success metrics, definition of done, report template).

Ready to draft when product owner confirms Shipment workspace vs. Order-embedded model.
