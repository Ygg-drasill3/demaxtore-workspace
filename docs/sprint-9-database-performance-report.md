# Sprint 9 — Database Performance Report

**Verdict:** PASS WITH RISK

## Query probes

- workspaces_all: 166ms
- rfq_by_state: 6ms
- audit_recent: 1514ms
- job_executions_recent: 534ms
- prisma_rfq_pagination_50: 54ms
- explain_rfq_open_list: 35ms

## Recommended indexes (documented)

- workspace (type, state, deadline_at) composite index (WARN)
- CommodityBid loadFull N+1 under high bid volume (WARN)

## Pagination

- prisma_rfq_pagination_50: 54ms
