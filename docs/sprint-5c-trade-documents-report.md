# Sprint 5C — Trade Documents Report

## Summary

Sprint 5C adds **Trade Documentation & Compliance** as an operational layer on Order and Shipment workspaces. Documents are tracked entities with requirements, upload, review, approval, and compliance status — not simple attachments.

No FSM contract files were modified. Shipment completion is gated via service-layer compliance check; `CompleteShipmentPayload` accepts optional `complianceOverride` for ADMIN.

## Delivered

| Phase | Item | Status |
|-------|------|--------|
| 1 | `packages/contracts/src/trade-documents.ts` | ✓ |
| 2 | `trade_documents`, `document_requirements`, `document_reviews` + migration `20260614120000_sprint5c_trade_documents` | ✓ |
| 3 | `document-requirements.ts` (export shipment defaults) | ✓ |
| 4 | `apps/backend/src/modules/trade-documents/*` — `applyDocumentAction()` | ✓ |
| 5 | Order + Shipment **Trade documents** sections | ✓ |
| 6 | Compliance engine (`NOT_READY` / `PARTIALLY_READY` / `READY_FOR_SHIPMENT`) | ✓ |
| 7 | Control Tower trade-document alerts | ✓ |
| 8 | Realtime socket events | ✓ |
| 9 | Append-only audit events | ✓ |
| 10 | `12-trade-documents.spec.ts` | ✓ |

## API

| Method | Path |
|--------|------|
| GET | `/api/trade-documents/:workspaceType/:workspaceId` |
| POST | `/api/trade-documents/:workspaceType/:workspaceId/upload` (multipart) |
| POST | `/api/trade-documents/:workspaceType/:workspaceId/actions/:action` |

Actions: `request-document`, `upload-document`, `review-document`, `approve-document`, `reject-document`, `expire-document`

## Default required documents (export)

- COMMERCIAL_INVOICE
- PACKING_LIST
- BILL_OF_LADING

Optional: CERTIFICATE_OF_ORIGIN, HEALTH_CERTIFICATE, INSURANCE_CERTIFICATE, etc.

## Shipment completion rule

`complete_shipment` blocked with `409 COMPLIANCE_NOT_READY` when required documents are not all `APPROVED`.

ADMIN may pass `payload: { complianceOverride: true }` on `complete-shipment`.

## Out of scope (honoured)

OCR, AI extraction, customs/government APIs, e-signature, ERP, invoice accounting, document generation AI.
