import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma, disconnectPrisma } from "../lib/prisma.mjs";
import { summarize } from "../lib/metrics.mjs";

const sqlDir = path.dirname(fileURLToPath(import.meta.url));

export async function runDbPerformance() {
  const db = getPrisma();
  const probes = [];

  const countQueries = [
    { name: "workspaces_all", sql: `SELECT COUNT(*)::int AS c FROM workspaces` },
    { name: "rfq_by_state", sql: `SELECT state, COUNT(*)::int AS c FROM workspaces WHERE type = 'RFQ' GROUP BY state` },
    { name: "audit_recent", sql: `SELECT COUNT(*)::int AS c FROM audit_logs WHERE created_at > NOW() - INTERVAL '30 days'` },
    { name: "job_executions_recent", sql: `SELECT COUNT(*)::int AS c FROM job_executions WHERE created_at > NOW() - INTERVAL '7 days'` },
  ];

  for (const q of countQueries) {
    const start = performance.now();
    await db.$queryRawUnsafe(q.sql);
    probes.push({ name: q.name, ms: Math.round(performance.now() - start) });
  }

  const paginationStart = performance.now();
  await db.workspace.findMany({
    where: { type: "RFQ" },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: 0,
    select: { id: true, state: true, externalRef: true, createdAt: true },
  });
  probes.push({ name: "prisma_rfq_pagination_50", ms: Math.round(performance.now() - paginationStart) });

  const explainStart = performance.now();
  try {
    await db.$queryRaw`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, state, created_at FROM workspaces
      WHERE type = 'RFQ' AND state = 'OPEN'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    probes.push({ name: "explain_rfq_open_list", ms: Math.round(performance.now() - explainStart), ok: true });
  } catch (e) {
    probes.push({
      name: "explain_rfq_open_list",
      ms: Math.round(performance.now() - explainStart),
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const tableStats = await db.$queryRaw`
    SELECT relname AS table_name, n_live_tup AS row_estimate
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
    LIMIT 15
  `;

  const indexStats = await db.$queryRaw`
    SELECT relname, indexrelname, idx_scan
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' AND idx_scan < 10
    ORDER BY idx_scan ASC
    LIMIT 10
  `;

  const knownGaps = [
    {
      item: "workspace (type, state, deadline_at) composite index",
      source: "docs/performance-review-report.md",
      severity: "WARN",
    },
    {
      item: "CommodityBid loadFull N+1 under high bid volume",
      source: "docs/performance-review-report.md",
      severity: "WARN",
    },
  ];

  await disconnectPrisma();

  const latencies = probes.map((p) => p.ms);
  const stats = summarize(latencies);
  const verdict =
    stats.p95 > 500 ? "PASS WITH RISK" : stats.p95 > 2000 ? "FAIL" : "PASS";

  return {
    phase: "C_database_performance",
    verdict,
    probes,
    aggregate: stats,
    tableStats,
    lowUseIndexes: indexStats,
    recommendedIndexes: knownGaps,
    searchNote: "Full-text search not a primary path; list filters use indexed workspace.type/state.",
  };
}
