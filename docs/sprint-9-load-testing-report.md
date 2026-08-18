# Sprint 9 — Load Testing Report

**Verdict:** PASS WITH RISK

RFQs in database: **83**

### Target 100 RFQs
- Extrapolation: linear_extrapolation_from_83_rfqs
- DB count query: 13ms
- healthz p95: 22ms (PASS)
- rfq_list p95: 133ms (PASS)
- system_health p95: 240ms

### Target 500 RFQs
- Extrapolation: linear_extrapolation_from_83_rfqs
- DB count query: 4ms
- healthz p95: 28ms (PASS)
- rfq_list p95: 169ms (PASS)
- system_health p95: 106ms


Full 1k–50k RFQ datasets require tools/enterprise-validation seed:scale in staging.

Staging: `SCALE_RFQS=10000 yarn seed:scale` from tools/enterprise-validation.
