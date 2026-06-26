import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { reconcileStaleRunningJobs } from "./job-reconciler.js";

const db = new PrismaClient();

describe("reconcileStaleRunningJobs", () => {
  beforeEach(async () => {
    await db.jobExecution.deleteMany({
      where: { jobName: "test_reconcile_job" },
    });
  });

  it("marks old RUNNING rows as FAILED", async () => {
    const old = new Date(Date.now() - 60 * 60_000);
    await db.jobExecution.create({
      data: {
        jobName: "test_reconcile_job",
        startedAt: old,
        status: "RUNNING",
      },
    });

    const result = await reconcileStaleRunningJobs(db, 30 * 60_000);
    expect(result.reconciled).toBeGreaterThanOrEqual(1);

    const row = await db.jobExecution.findFirst({
      where: { jobName: "test_reconcile_job" },
      orderBy: { startedAt: "desc" },
    });
    expect(row?.status).toBe("FAILED");
    expect(row?.finishedAt).not.toBeNull();
  });
});
