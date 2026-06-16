// apps/backend/src/server.ts
// Process entrypoint. Boots Express + Socket.io on env.PORT.
import http from "node:http";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initSocket } from "./realtime/socket.js";
import { pruneExpired } from "./modules/auth/bruteforce.js";
import { startSlaWorker } from "./modules/messaging/sla-worker.js";
import { startCommodityBidScheduler } from "./modules/commoditybid/commoditybid.scheduler.js";
import { startRfqScheduler } from "./modules/rfq/rfq.scheduler.js";
import { startControlTowerScheduler } from "./modules/control-tower/control-tower.scheduler.js";
import { startTrackingScheduler } from "./modules/tracking/tracking.scheduler.js";
import { prisma } from "./db/prisma.js";
import { reconcileStaleRunningJobs } from "./modules/jobs/job-reconciler.js";
import { closeSchedulerPool } from "./db/scheduler-lock.js";

async function main(): Promise<void> {
  // Probe DB at boot — fail fast if migrations weren't run.
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("✓ Database connection ok");
    const reclaimed = await reconcileStaleRunningJobs(prisma, env.JOB_STALE_RUNNING_MS);
    if (reclaimed.reconciled > 0) {
      logger.info({ reclaimed }, "Stale RUNNING jobs reconciled on boot");
    }
  } catch (e) {
    logger.error({ err: e }, "✗ Database connection failed — check DATABASE_URL & migrations");
    process.exit(1);
  }

  const app    = buildApp();
  const server = http.createServer(app);
  server.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = env.HTTP_HEADERS_TIMEOUT_MS;
  server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
  await initSocket(server);

  // Light periodic cleanup of brute-force map.
  setInterval(pruneExpired, 5 * 60 * 1000).unref();

  // Proforma SLA reminder worker (Sprint 2.9).
  startSlaWorker();
  startCommodityBidScheduler();
  startRfqScheduler();
  startControlTowerScheduler();
  startTrackingScheduler();

  setInterval(() => {
    void reconcileStaleRunningJobs(prisma, env.JOB_STALE_RUNNING_MS);
  }, env.JOB_RECONCILE_INTERVAL_MS).unref();

  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`✓ DeMaxtore backend listening on http://0.0.0.0:${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Graceful shutdown initiated");
    server.close(() => {
      void Promise.all([prisma.$disconnect(), closeSchedulerPool()]).finally(() => process.exit(0));
    });
    // Hard exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT",  () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
