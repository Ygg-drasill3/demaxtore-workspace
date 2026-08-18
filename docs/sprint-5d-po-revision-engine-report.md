# Sprint 5D — PO Revision Engine Report

## Design

The revision engine is **append-only**. No snapshot is overwritten.

| Event | Revision created |
|-------|------------------|
| Initial PO issuance (`createPurchaseOrderOnOrderSpawn`) | Revision `1` with `snapshot_json` of header + lines |
| Amendment approved (`approve_amendment`) | Next sequential revision with updated header/lines snapshot |

Each revision stores:

- `revision_number` (unique per PO)
- `created_by` (actor user id)
- `reason` (required on approval; default on issuance)
- `snapshot_json` (immutable JSON: header + lines)

## API / UI

- `GET /api/purchase-orders/:id` returns `revisions[]` ordered newest first
- PO workspace section `po-revisions` lists revision number, date, and reason

## Guarantees

- Unique constraint on `(purchase_order_id, revision_number)`
- Line replacement on amendment approval happens before snapshot capture
- Audit events: `po.amendment.approved` includes `revisionNumber` in payload

## Not in scope

Document versioning, PDF diffing, or legal redlining — operational snapshots only.
