import { login, timedFetch, auth } from "../lib/http.mjs";

export async function runObservability() {
  const adminToken = await login("admin@demaxtore.local", "Passw0rd!");

  const checks = {
    healthz: await timedFetch("/api/healthz"),
    systemHealth: await timedFetch("/api/system/health", { headers: auth(adminToken) }),
    systemInsights: await timedFetch("/api/system/insights", { headers: auth(adminToken) }),
    systemJobs: await timedFetch("/api/system/jobs", { headers: auth(adminToken) }),
    failedJobs: await timedFetch("/api/system/jobs/failed", { headers: auth(adminToken) }),
    controlTowerMetrics: await timedFetch("/api/control-tower/metrics", { headers: auth(adminToken) }),
  };

  const failedJobs = checks.failedJobs.body ?? [];
  const components = checks.systemHealth.body?.components ?? [];

  return {
    phase: "phase10_observability",
    verdict: Object.values(checks).every((c) => c.ok) ? "PASS" : "FAIL",
    checks: Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [k, { ok: v.ok, ms: v.ms, status: v.status }]),
    ),
    healthOverall: checks.systemHealth.body?.overall,
    componentCount: components.length,
    degradedComponents: components.filter((c) => c.status !== "up").map((c) => c.key),
    recentFailedJobs: failedJobs.slice(0, 5),
    dashboardRoute: "/operations/system",
  };
}
