import { getPrisma, disconnectPrisma } from "../lib/prisma.mjs";
import { API_BASE, DATABASE_URL } from "../lib/config.mjs";

function poolParamsFromUrl(url) {
  try {
    const u = new URL(url);
    return {
      connection_limit: u.searchParams.get("connection_limit"),
      pool_timeout: u.searchParams.get("pool_timeout"),
      connect_timeout: u.searchParams.get("connect_timeout"),
    };
  } catch {
    return {};
  }
}

export async function runPoolReview() {
  const db = getPrisma();
  const started = performance.now();
  await db.$queryRaw`SELECT 1`;
  const pingMs = Math.round(performance.now() - started);

  const [maxConn, active] = await Promise.all([
    db.$queryRaw`SHOW max_connections`,
    db.$queryRaw`
      SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()
    `,
  ]);

  await disconnectPrisma();

  const params = poolParamsFromUrl(DATABASE_URL);
  const connectionLimit = Number(params.connection_limit ?? 10);
  const activeCount = active[0]?.n ?? 0;
  const maxConnections = Number(maxConn[0]?.max_connections ?? 100);

  const headroom = maxConnections - activeCount;
  const verdict =
    connectionLimit <= headroom && pingMs < 50
      ? "PASS"
      : connectionLimit > headroom * 0.5
        ? "PASS WITH RISK"
        : "FAIL";

  return {
    phase: "A_pool_review",
    verdict,
    apiBase: API_BASE,
    databaseUrlRedacted: DATABASE_URL.replace(/:[^:@]+@/, ":***@"),
    prismaPool: params,
    postgres: { maxConnections, activeConnections: activeCount, headroom },
    pingMs,
    recommendations: [
      "Set DATABASE_CONNECTION_LIMIT ≤ (max_connections − reserved) / backend_instances",
      "Use PgBouncer in transaction mode for >2 API replicas",
      "Keep scheduler advisory work off Prisma pool (dedicated pg pool in scheduler-lock.ts)",
    ],
  };
}
