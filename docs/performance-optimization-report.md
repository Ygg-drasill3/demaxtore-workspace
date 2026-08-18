# DeMaxtore Performance Optimization Report

**Date:** 2026-06-05  
**Scope:** Faz 1–4 (balanced frontend + backend + nginx)

## Summary

Performance work targeted the highest-impact bottlenecks: admin N+1 queries, monolithic frontend bundle, render-blocking fonts, missing cache headers, and socket-driven refetch storms.

## Changes by phase

### Faz 1 — Quick wins

| Area | Change | Expected impact |
|------|--------|-----------------|
| Backend | `listAllProgress` reads persisted rows (no per-user sync loop) | Admin onboarding list: ~3600 → ~1 query |
| Backend | Growth funnel/lost-opportunities batch maps; insights computes funnel once | Growth insights: ~12k → ~10 queries |
| DB | Indexes on `audit_logs(action, created_at)`, onboarding stalled scan, `workspaces(type, created_at)` | Faster SLA + funnel scans |
| Nginx | gzip, immutable asset cache, API/socket timeouts | Smaller transfers, fewer 502s |
| Frontend | Notification drawer fetch gated on open; onboarding socket consolidated; CT debounce 300ms | Fewer idle API calls + refetches |

### Faz 2 — Frontend

| Area | Change |
|------|--------|
| Routes | `React.lazy` + `Suspense` for all feature pages |
| Vite | `manualChunks` (vendor/query/socket) + `rollup-plugin-visualizer` → `dist/stats.html` |
| Fonts | Self-hosted `@fontsource/inter-tight` + `@fontsource/fraunces` (CDN removed) |
| React Query | Domain `staleTime` constants; RFQ list prefetch on row hover |
| RFQ workspace | Consolidated socket invalidation; timeline fetch when expanded; LazyMount for comms/docs |
| Order workspace | LazyMount + lazy chunks for FreightIQ / trade documents |

### Faz 3 — Backend API

| Area | Change |
|------|--------|
| Control Tower | Supplier/buyer performance via `groupBy` (~600 queries → ~7) |
| Control Tower | SLA audit joins batched (no per-log workspace lookup) |
| Tracking | `getOpsSummary` uses `DISTINCT ON (shipment_id)` (~201 → 2 queries) |
| Cache | In-memory TTL cache for growth/market/CT overview metrics |
| BFF | `GET /api/control-tower/dashboard` bundles overview + alerts + SLA + freight commercial |
| Rate limit | Admin analytics routes: 30 req/min/IP |

### Faz 4 — Measurement

| Script | Purpose |
|--------|---------|
| `scripts/perf-benchmark.mjs` | Backend endpoint latency table |
| `scripts/lighthouse-ci.sh` | Lighthouse for login, buyer dashboard, operations |

## How to measure

```bash
# Backend benchmarks (admin JWT required)
PERF_BENCH_TOKEN=<jwt> node scripts/perf-benchmark.mjs

# Frontend Lighthouse
chmod +x scripts/lighthouse-ci.sh
./scripts/lighthouse-ci.sh

# Bundle analysis (after frontend build)
open apps/frontend/dist/stats.html
```

## Target vs expected

| Metric | Before (est.) | Target | Notes |
|--------|-----------------|--------|-------|
| Initial JS gzip | ~214 KB | <120 KB | Route split + chunks reduce login payload |
| `/operations` HTTP (first paint) | 7 parallel | ≤4 | BFF dashboard + lazy below-fold sections |
| `GET /onboarding/users` | 3600+ queries | <20 | Direct row read |
| `GET /growth/insights` | 3× funnel + RFQ loop | <30 + cache | Single funnel + batch maps |
| Repeat static visit | Full reload | 1y immutable | nginx `/assets/*` headers |

## Verification

Run Playwright specs after deploy:

- `08-control-tower`
- `19-growth-engine`
- `22-guided-onboarding`

## Operational notes

- Admin analytics cache TTL: 2–10 minutes; invalidated after Control Tower alert scan.
- `index.html` is `no-cache`; hashed assets are `immutable`.
- Sync onboarding progress remains on `GET /api/onboarding/progress` only (current user).
