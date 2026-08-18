# Sprint 4A — Alert Engine Report

## Architecture

- **Module:** `apps/backend/src/modules/control-tower/alert-engine.ts`
- **Scheduler:** `control-tower.scheduler.ts` (advisory lock `903903`, same interval as SLA worker)
- **Dedup:** partial unique index on `(workspace_id, alert_key)` where `resolved_at IS NULL`
- **Auto-resolve:** open alerts cleared when underlying condition no longer holds

## Rules implemented

| Category | Condition | Severity | Alert key |
|----------|-----------|----------|-----------|
| RFQ | `RFQ_SUBMITTED` >24h, no supplier assignment | WARNING | `rfq_submitted_unassigned` |
| RFQ | `RFQ_OPEN`, zero quotations, deadline <48h | WARNING | `rfq_open_no_quotes_deadline` |
| RFQ | `PROFORMA_REQUESTED`, `proformaSlaDeadlineAt` passed | CRITICAL | `rfq_proforma_sla_past` |
| CommodityBid | `BID_OPEN`, no bids, deadline <48h | WARNING | `cb_open_no_bids_deadline` |
| CommodityBid | `AWARDS_PUBLISHED`, published award past `slaDeadlineAt` | CRITICAL | `cb_award_acceptance_overdue` |
| Order | `ORDER_CREATED` inactive >48h | WARNING | `order_created_inactive` |
| Order | `PRODUCTION_STARTED` / `PRODUCTION_IN_PROGRESS` stalled >72h | WARNING | `order_production_stalled` |
| Order | `INSPECTION_REQUESTED` >5 days without completion | CRITICAL | `order_inspection_sla_past` |
| Shipment | `IN_TRANSIT` past linked order `currentEta` | CRITICAL | `shipment_eta_exceeded` |
| Shipment | `CUSTOMS_CLEARANCE` >72h without completion | WARNING | `shipment_customs_stuck` |
| Shipment | state `EXCEPTION` | CRITICAL | `shipment_exception` |

## Realtime

On create: `controltower.alert.created` → `role:ADMIN`  
On resolve (manual or auto): `controltower.alert.resolved` → `role:ADMIN`  
On scheduled scan: `controltower.metric.updated` → `role:ADMIN`

## Order state mapping note

Sprint prompt referenced `READY_FOR_PRODUCTION` and `INSPECTION_PENDING`; the live Order FSM uses `PRODUCTION_STARTED` / `PRODUCTION_IN_PROGRESS` and `INSPECTION_REQUESTED`. Rules map to actual FSM states without modifying the FSM.
