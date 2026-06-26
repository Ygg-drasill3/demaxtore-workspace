import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { prisma } from "../../db.js";
import { JobService } from "./job.service.js";
import { SystemHealthService } from "./system-health.service.js";
import { BackupVerificationService } from "./backup-verification.service.js";
import { StorageHealthService } from "./storage-health.service.js";
import { exportSystemCsv } from "./system-csv.js";
import { systemAudit } from "./system-audit.js";
import { reconcileStaleRunningJobs } from "./job-reconciler.js";
import { env } from "../../config/env.js";

const jobService = new JobService(prisma);
const health = new SystemHealthService(prisma);
const backup = new BackupVerificationService(prisma);
const storage = new StorageHealthService(prisma);

export const systemRouter = Router();

systemRouter.use(requireAuth, requireRole("ADMIN"));

systemRouter.get("/health", asyncHandler(async (_req, res) => {
  res.json(await health.getDetailedHealth());
}));

systemRouter.get("/jobs", asyncHandler(async (_req, res) => {
  res.json(await jobService.getJobStatuses());
}));

systemRouter.get("/jobs/history", asyncHandler(async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 100);
  const jobName = typeof req.query.jobName === "string" ? req.query.jobName : undefined;
  res.json(await jobService.getHistory(limit, jobName));
}));

systemRouter.get("/jobs/failed", asyncHandler(async (_req, res) => {
  res.json(await jobService.getFailedJobs());
}));

systemRouter.get("/jobs/stuck-running", asyncHandler(async (_req, res) => {
  res.json(await jobService.getStuckRunning(env.JOB_STALE_RUNNING_MS));
}));

systemRouter.post("/jobs/reconcile-stale", asyncHandler(async (_req, res) => {
  const result = await reconcileStaleRunningJobs(prisma, env.JOB_STALE_RUNNING_MS);
  await systemAudit(prisma, "job.executed", { kind: "reconcile_stale", ...result });
  res.json(result);
}));

systemRouter.get("/schedulers", asyncHandler(async (_req, res) => {
  res.json(await jobService.getSchedulerStatuses());
}));

systemRouter.get("/storage", asyncHandler(async (_req, res) => {
  res.json(await storage.scan());
}));

systemRouter.get("/backup", asyncHandler(async (_req, res) => {
  res.json(await backup.getStatus());
}));

systemRouter.post("/backup/verify", asyncHandler(async (req, res) => {
  const body = req.body as {
    checkType?: "backup" | "restore";
    status?: "ok" | "failed" | "pending";
    notes?: string;
  };
  if (!body.checkType || !body.status) {
    res.status(400).json({ error: "checkType and status required" });
    return;
  }
  const row = await backup.recordCheck({
    checkType: body.checkType,
    status: body.status,
    notes: body.notes,
    verifiedById: req.user?.id,
  });
  res.status(201).json(row);
}));

systemRouter.get("/insights", asyncHandler(async (_req, res) => {
  res.json(await health.getDashboardInsight());
}));

systemRouter.get(
  "/export/:reportType.csv",
  asyncHandler(async (req, res) => {
    const csv = await exportSystemCsv(req.params.reportType, prisma);
    await systemAudit(prisma, "system.alert.generated", {
      export: req.params.reportType,
      kind: "csv",
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="system-${req.params.reportType}.csv"`,
    );
    res.send(csv);
  }),
);
