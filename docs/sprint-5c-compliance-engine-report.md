# Sprint 5C — Compliance Engine Report

## Purpose

Provide a single **Compliance Summary** per workspace so operations and buyers know whether export documentation is complete before shipment closure.

## Status model

| Status | Meaning |
|--------|---------|
| `NOT_READY` | No required document approved |
| `PARTIALLY_READY` | Some but not all required documents approved |
| `READY_FOR_SHIPMENT` | All required documents approved |

## Computation

`compliance-engine.ts` — `computeComplianceFromRows(requirements, documents)`:

- Iterates `document_requirements` where `required = true`
- Matches `trade_documents` by `documentType`
- Counts rows with `status === APPROVED`
- Builds checklist with per-type status (MISSING if no row)

## Seeding

Requirements are seeded on the **first document action** (upload, request, approve, etc.), not on passive `GET` summary — so legacy shipment flows without trade-doc access are unaffected.

`ensureRequirements()`:

1. Inserts default rules from `EXPORT_SHIPMENT_REQUIREMENTS` (`document-requirements.ts`)
2. Creates placeholder `trade_documents` rows (status `MISSING`) per type

## Shipment gate

`compliance.ts` — `assertShipmentCompletionAllowed()`:

- Called from `shipment.service` before `complete_shipment` transition (service hook only)
- Skipped when no requirements seeded yet (`requiredCount === 0`)
- Allows transition when `READY_FOR_SHIPMENT`
- Allows ADMIN + `complianceOverride: true`

## Audit

When approval of the last required document moves status to `READY_FOR_SHIPMENT`, audit event `compliance.ready` is appended.

## Control Tower

| Key | Severity |
|-----|----------|
| `trade_doc_required_missing` | WARNING |
| `trade_doc_rejected` | WARNING |
| `trade_doc_missing_72h` | CRITICAL |
| `trade_doc_delivered_incomplete` | CRITICAL |

Scanned via `scanTradeDocumentAlerts()` in full alert-engine run.
