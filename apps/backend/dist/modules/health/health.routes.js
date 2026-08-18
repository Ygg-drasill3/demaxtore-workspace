// apps/backend/src/modules/health/health.routes.ts
import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getSocketAdapterStatus } from "../../realtime/socket-adapter.js";
import { getRedisClient, redisUrl } from "../../lib/redis.js";
import { resolveStorageProvider } from "../../lib/storage-provider.js";
import { getBuildInfo } from "../../lib/build-info.js";
import { getSafetyGateStatuses, areProductionSafetyGatesSatisfied } from "../../config/production-safety.js";
import { getPaymentCapabilities } from "../payments/payment-provider.factory.js";
const router = Router();
/** Liveness — process is up (no dependency checks). */
router.get("/", (_req, res) => {
    const build = getBuildInfo();
    res.status(200).json({
        status: "ok",
        uptimeSec: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        commitSha: build.commitSha,
        branch: build.branch,
        buildTime: build.buildTime,
    });
});
/** Readiness — dependencies required to serve traffic. */
export async function readinessHandler(_req, res) {
    const checks = {};
    try {
        await prisma.$queryRaw `SELECT 1`;
        checks.db = "up";
    }
    catch {
        checks.db = "down";
    }
    // Redis backs the rate limiters, which fail closed with 503 when it is unreachable —
    // losing it takes down login. Probe it whenever REDIS_URL is set rather than only when
    // it also serves as the socket adapter, or readiness stays green while auth is broken.
    if (redisUrl()) {
        try {
            const client = await getRedisClient();
            await client.ping();
            checks.redis = "up";
        }
        catch {
            checks.redis = "down";
        }
    }
    else {
        checks.redis = "skipped";
    }
    try {
        const provider = resolveStorageProvider();
        if (provider.name === "s3") {
            checks.storage = env.S3_BUCKET ? "up" : "down";
        }
        else {
            await provider.getPath("");
            checks.storage = "up";
        }
    }
    catch {
        checks.storage = "down";
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
        checks.email = "degraded";
    }
    else if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_HOST) {
        checks.email = "degraded";
    }
    else {
        checks.email = "up";
    }
    const socketStatus = getSocketAdapterStatus();
    checks.socketAdapter = socketStatus.adapter === "redis"
        ? (socketStatus.redisConnected ? "up" : "down")
        : "up";
    const blocking = Object.values(checks).some((v) => v === "down");
    const safetyGates = getSafetyGateStatuses();
    const safetyGatesOk = areProductionSafetyGatesSatisfied();
    const ready = !blocking && safetyGatesOk;
    res.status(ready ? 200 : 503).json({
        ready,
        checks: {
            ...checks,
            safetyGates: safetyGatesOk ? "up" : "down",
        },
        safetyGates,
        payments: getPaymentCapabilities(),
        timestamp: new Date().toISOString(),
    });
}
router.get("/ready", (req, res, next) => {
    void readinessHandler(req, res).catch(next);
});
export default router;
//# sourceMappingURL=health.routes.js.map