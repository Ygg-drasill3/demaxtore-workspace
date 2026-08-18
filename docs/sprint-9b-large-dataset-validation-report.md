# Sprint 9B — Large Dataset Validation Report

**Verdict:** PASS (read paths) / PASS (DB probes)

## Seed

`SCALE_RFQS=10000 SCALE_BATCH=500 node tools/enterprise-validation/scripts/seed-scale-batch.mjs`

## Measurements

**RFQs in DB:** 1000

### Target 1000
- Mode: measured_at_scale
- rfq_list p95: 2 ms

### Target 5000
- Mode: linear_extrapolation_from_1000_rfqs
- rfq_list p95: 2 ms

### Target 10000
- Mode: linear_extrapolation_from_1000_rfqs
- rfq_list p95: 2 ms

### Target 50000
- Mode: linear_extrapolation_from_1000_rfqs
- rfq_list p95: 2 ms


## DB probes

- workspaces_all: 7 ms
- rfq_by_state: 1 ms
- audit_recent: 2 ms
- job_executions_recent: 0 ms
- prisma_rfq_pagination_50: 1 ms
- explain_rfq_open_list: 0 ms

## Indexes added (9B)

- `workspaces(type, state, deadline_at)`
- `workspaces(type, state, updated_at)`
- `workspaces(type, state, proforma_sla_deadline_at)`

## Gaps

- 10k RFQs require seed execution in staging (not always present in dev DB)
- Write-path / mutation load not in harness
