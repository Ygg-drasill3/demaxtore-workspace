# Sprint 12D — Mixed Container Playwright Results

## Test File

`apps/e2e/tests/32-mixed-container-allocation-payment.spec.ts`

## Run Configuration

- API: `E2E_API_URL=http://localhost:3001`
- Frontend: `http://localhost:3000`
- Workers: 1 (serial — shared DB state)

## Results

| # | Test | Status |
|---|------|--------|
| 01 | Setup: buyer requests pricing and admin sends offer | PASS |
| 02 | Buyer approves offer | PASS |
| 03 | Operations creates supplier allocation | PASS |
| 04 | Operations uploads proforma | PASS |
| 05 | Buyer sees proformas without supplier identity | PASS |
| 06 | Buyer marks payment sent, ops confirms | PASS |
| 07 | Execution ready state and buyer timeline | PASS |
| 08 | Control Tower alerts for coordination | PASS |

**Total: 8/8 PASS**

## Validations Covered

- Allocation creation via admin workspace UI
- Proforma upload via API
- Buyer coordination view shows proformas and allocations
- Payment status updates (PENDING → PAYMENT_SENT → PAYMENT_CONFIRMED)
- Execution ready transition (`MC_EXECUTION_READY`)
- Control Tower alert `mixed_container_execution_ready`
- Supplier anonymity preserved (no `SUP-` in buyer JSON)

## Date

2026-06-08
