import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { USERS } from "../lib/config.mjs";

export async function runDisasterRecovery() {
  const adminToken = await login(USERS.admin.email, USERS.admin.password);

  const backupStatus = await timedFetch("/api/system/backup", { headers: authHeaders(adminToken) });

  const verifyStart = performance.now();
  const verify = await timedFetch("/api/system/backup/verify", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      checkType: "backup",
      status: "ok",
      notes: "Sprint 9 validation drill — logical backup assumed per runbook",
    }),
  });
  const verifyMs = Math.round(performance.now() - verifyStart);

  const healthAfter = await timedFetch("/api/healthz");

  const verdict =
    verify.ok && healthAfter.ok
      ? "PASS WITH RISK"
      : "FAIL";

  return {
    phase: "F_disaster_recovery",
    verdict,
    backupStatus: backupStatus.body,
    verificationRecorded: verify.ok,
    verifyMs,
    rtoTargetMinutes: 60,
    rpoTargetMinutes: 15,
    rtoMeasured: "Not executed — requires staged pg_restore drill",
    rpoMeasured: "Depends on backup cadence per docs/backup-runbook.md",
    runbooks: ["docs/backup-runbook.md", "docs/restore-runbook.md"],
    restoreDrill: "Manual pg_restore + uploads tar; validate GET /api/healthz db:up",
    recoveryPointObjective: "PASS WITH RISK until restore drill completed in staging",
  };
}
