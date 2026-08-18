import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { USERS } from "../lib/config.mjs";

export async function runObservability() {
  const adminToken = await login(USERS.admin.email, USERS.admin.password);

  const checks = {
    healthz: await timedFetch("/api/healthz"),
    systemHealth: await timedFetch("/api/system/health", { headers: authHeaders(adminToken) }),
    systemInsights: await timedFetch("/api/system/insights", { headers: authHeaders(adminToken) }),
    systemJobs: await timedFetch("/api/system/jobs", { headers: authHeaders(adminToken) }),
    controlTowerMetrics: await timedFetch("/api/control-tower/metrics", {
      headers: authHeaders(adminToken),
    }),
  };

  const components = checks.systemHealth.body?.components ?? [];
  const alertKeys = [
    "system.job.failed",
    "system.job.stale",
    "system.storage.error",
    "system.backup.overdue",
  ];

  const allOk = Object.values(checks).every((c) => c.ok);
  const verdict = allOk ? "PASS" : "FAIL";

  return {
    phase: "I_observability",
    verdict,
    checks: Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [k, { ok: v.ok, ms: v.ms, status: v.status }]),
    ),
    structuredLogging: "Pino JSON logger (LOG_LEVEL env)",
    healthComponents: components.length,
    systemAlertKeysReady: alertKeys,
    dashboardRecommendations: [
      "Grafana: API latency, healthz, Postgres connections",
      "Use /operations/system for job + storage + backup widgets",
      "Control Tower for operational alerts",
      "Track job_executions failure rate and SKIPPED ratio per instance",
    ],
  };
}
