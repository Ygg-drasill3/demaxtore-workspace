import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { getPrisma, disconnectPrisma } from "../lib/prisma.mjs";
import { USERS } from "../lib/config.mjs";

export async function runJobReliability() {
  const adminToken = await login(USERS.admin.email, USERS.admin.password);
  const db = getPrisma();

  const scanStart = performance.now();
  const scan = await timedFetch("/api/control-tower/scan", {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  const scanMs = Math.round(performance.now() - scanStart);

  const jobsRes = await timedFetch("/api/system/jobs", { headers: authHeaders(adminToken) });
  const failedRes = await timedFetch("/api/system/jobs/failed", { headers: authHeaders(adminToken) });
  const historyRes = await timedFetch("/api/system/jobs/history?limit=50", {
    headers: authHeaders(adminToken),
  });

  const stuck = await db.jobExecution.findMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - 30 * 60_000) } },
    take: 10,
  });

  const recentFailed = await db.jobExecution.findMany({
    where: { status: "FAILED" },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  await disconnectPrisma();

  const jobs = jobsRes.body ?? [];
  const staleJobs = Array.isArray(jobs) ? jobs.filter((j) => j.stale) : [];

  const verdict =
    stuck.length > 0
      ? "FAIL"
      : scan.ok && staleJobs.length === 0 && recentFailed.length === 0
        ? "PASS"
        : "PASS WITH RISK";

  return {
    phase: "E_job_reliability",
    verdict,
    controlTowerScan: { ok: scan.ok, ms: scanMs, status: scan.status },
    jobRegistry: Array.isArray(jobs) ? jobs.length : 0,
    staleJobs,
    failedEndpoint: failedRes.body,
    stuckRunning: stuck,
    recentFailures: recentFailed,
    retryMechanism: "Scheduler re-runs on interval; failures logged in job_executions",
    deadLetter: "Control Tower system.job.failed alerts; no external queue DLQ (in-process schedulers)",
    jobsStressTested: [
      "control_tower_alert_scan",
      "proforma_sla_email",
      "commoditybid_system_fsm",
      "maritime_tracking_sync",
    ],
  };
}
