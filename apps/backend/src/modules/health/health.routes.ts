// apps/backend/src/modules/health/health.routes.ts
import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getSocketAdapterStatus } from "../../realtime/socket-adapter.js";
import { resolveStorageProvider } from "../../lib/storage-provider.js";

const router = Router();

/** Liveness — process is up (no dependency checks). */
router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/** Readiness — dependencies required to serve traffic. */
export async function readinessHandler(
  _req: import("express").Request,
  res: import("express").Response,
): Promise<void> {
  const checks: Record<string, "up" | "down" | "degraded" | "skipped"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "up";
  } catch {
    checks.db = "down";
  }

  if (env.SOCKET_ADAPTER === "redis") {
    const { adapter, redisConnected } = getSocketAdapterStatus();
    checks.redis = adapter === "redis" && redisConnected ? "up" : "down";
  } else {
    checks.redis = "skipped";
  }

  try {
    const provider = resolveStorageProvider();
    if (provider.name === "s3") {
      checks.storage = env.S3_BUCKET ? "up" : "down";
    } else {
      await provider.getPath("");
      checks.storage = "up";
    }
  } catch {
    checks.storage = "down";
  }

  if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
    checks.email = "degraded";
  } else if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_HOST) {
    checks.email = "degraded";
  } else {
    checks.email = "up";
  }

  const socketStatus = getSocketAdapterStatus();
  checks.socketAdapter = socketStatus.adapter === "redis"
    ? (socketStatus.redisConnected ? "up" : "down")
    : "up";

  const blocking = Object.values(checks).some((v) => v === "down");
  const ready = !blocking;

  res.status(ready ? 200 : 503).json({
    ready,
    checks,
    timestamp: new Date().toISOString(),
  });
}

router.get("/ready", (req, res, next) => {
  void readinessHandler(req, res).catch(next);
});

export default router;
