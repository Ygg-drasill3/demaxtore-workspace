import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { logger } from "../config/logger.js";

/** Stable advisory lock ids for in-process schedulers (single holder per lock). */
export const SchedulerLockId = {
  PROFORMA_SLA: 903901n,
  COMMODITYBID: 903902n,
  CONTROL_TOWER: 903903n,
  TRACKING:      903904n,
  RFQ_DEADLINE:  903905n,
  WHATSAPP_BRIDGE: 903906n,
  EMAIL_BRIDGE:    903907n,
} as const;

type PgModule = typeof import("pg");

let schedulerPool: import("pg").Pool | null = null;

async function loadPg(): Promise<PgModule | null> {
  try {
    return await import("pg");
  } catch {
    logger.warn("pg module not installed — scheduler locks use Prisma transaction fallback (run yarn install)");
    return null;
  }
}

async function getSchedulerPool(pg: PgModule): Promise<import("pg").Pool> {
  if (!schedulerPool) {
    const { buildDatabaseUrl } = await import("../lib/database-url.js");
    const { env } = await import("../config/env.js");
    schedulerPool = new pg.Pool({
      connectionString: buildDatabaseUrl(env.DATABASE_URL),
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return schedulerPool;
}

async function withDedicatedConnection(
  lockId: bigint,
  fn: () => Promise<void>,
): Promise<boolean> {
  const pg = await loadPg();
  if (!pg) return withPrismaTransactionFallback(lockId, fn);

  const pool = await getSchedulerPool(pg);
  const client = await pool.connect();
  try {
    const acquired = await client.query<{ ok: boolean }>(
      "SELECT pg_try_advisory_lock($1::bigint) AS ok",
      [lockId.toString()],
    );
    if (!acquired.rows[0]?.ok) return false;
    try {
      await fn();
      return true;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1::bigint)", [lockId.toString()]);
    }
  } finally {
    client.release();
  }
}

/** Legacy: holds one Prisma pool connection for entire job (Sprint 9B prefers dedicated pool). */
async function withPrismaTransactionFallback(
  lockId: bigint,
  fn: () => Promise<void>,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const acquired = await tx.$queryRaw<Array<{ ok: boolean }>>(
      Prisma.sql`SELECT pg_try_advisory_lock(${lockId}) AS ok`,
    );
    if (!acquired[0]?.ok) return false;
    try {
      await fn();
      return true;
    } finally {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_unlock(${lockId})`);
    }
  });
}

/**
 * Runs `fn` only if this process acquires the Postgres session advisory lock.
 * Uses a dedicated pg pool when available so long jobs do not hold a Prisma transaction.
 */
export async function withSchedulerLock(
  lockId: bigint,
  fn: () => Promise<void>,
): Promise<boolean> {
  return withDedicatedConnection(lockId, fn);
}

export async function closeSchedulerPool(): Promise<void> {
  if (schedulerPool) {
    await schedulerPool.end();
    schedulerPool = null;
  }
}
