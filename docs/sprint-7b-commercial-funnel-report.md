# Sprint 7B — Commercial Funnel Report

## Primary funnel stages

| Stage | Key |
|-------|-----|
| RFQ Created | `rfq_created` |
| RFQ Submitted | `rfq_submitted` |
| Supplier Assigned | `supplier_assigned` |
| Quotation Submitted | `quotation_submitted` |
| Supplier Selected | `supplier_selected` |
| PO Issued | `po_issued` |
| Order Created | `order_created` |
| Shipment Created | `shipment_created` |
| Shipment Completed | `shipment_completed` |

## Metrics per stage

- Count of RFQs reaching the stage
- Conversion % vs previous stage
- Drop-off %
- Average time (hours) where computable

## API

| Method | Path |
|--------|------|
| GET | `/api/growth/funnel` |
| GET | `/api/growth/conversion` |
| GET | `/api/growth/dropoffs` |

## Implementation

`GrowthService.computeFunnelCounts` aggregates workspace, assignment, quotation, order, and shipment data without FSM changes.

## Status

**PASS**
