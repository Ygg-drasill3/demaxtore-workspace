-- Sprint 9 — Database performance probes (read-only)
-- Run via phases/db-performance.mjs

-- Table sizes
SELECT relname AS table_name, n_live_tup AS row_estimate
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 20;

-- Missing / unused index hints
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 15;

-- Slow statements (requires pg_stat_statements extension; optional)
-- SELECT query, calls, mean_exec_time, max_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
