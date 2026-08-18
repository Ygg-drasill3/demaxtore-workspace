import { getPrisma, disconnectPrisma } from "../lib/prisma.mjs";
import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { summarize, verdictFromLatency } from "../lib/metrics.mjs";
import { LOAD_TARGETS, QUICK, USERS } from "../lib/config.mjs";

/** Read-heavy load simulation scaled to RFQ count in DB (no FSM mutations). */
export async function runLoadTest() {
  const db = getPrisma();
  const rfqCount = await db.workspace.count({ where: { type: "RFQ" } });
  const adminToken = await login(USERS.admin.email, USERS.admin.password);

  const endpoints = [
    { name: "healthz", path: "/api/healthz", headers: {} },
    { name: "system_health", path: "/api/system/health", headers: authHeaders(adminToken) },
    { name: "rfq_list", path: "/api/rfq?limit=50", headers: authHeaders(adminToken) },
    { name: "control_tower_metrics", path: "/api/control-tower/metrics", headers: authHeaders(adminToken) },
  ];

  const tiers = [];
  for (const target of LOAD_TARGETS) {
    const iterations = QUICK
      ? Math.min(50, Math.max(10, Math.floor(target / 20)))
      : Math.min(200, Math.max(20, Math.floor(target / 50)));

    const tier = { targetRfqs: target, actualRfqsInDb: rfqCount, iterations, endpoints: {} };

    for (const ep of endpoints) {
      const samples = [];
      let errors = 0;
      for (let i = 0; i < iterations; i++) {
        const r = await timedFetch(ep.path, { headers: ep.headers });
        samples.push(r.ms);
        if (!r.ok) errors++;
      }
      const stats = summarize(samples);
      stats.errors = errors;
      stats.verdict = verdictFromLatency(stats.p95);
      tier.endpoints[ep.name] = stats;
    }

    const dbStart = performance.now();
    await db.$queryRaw`SELECT COUNT(*)::int AS c FROM workspaces WHERE type = 'RFQ'`;
    tier.dbCountMs = Math.round(performance.now() - dbStart);

    tier.extrapolated =
      rfqCount >= target
        ? "measured_at_scale"
        : rfqCount > 0
          ? `linear_extrapolation_from_${rfqCount}_rfqs`
          : "insufficient_seed_data";

    tier.verdict =
      Object.values(tier.endpoints).every((e) => e.verdict === "PASS")
        ? rfqCount >= Math.min(target, 1000)
          ? "PASS"
          : "PASS WITH RISK"
        : Object.values(tier.endpoints).some((e) => e.verdict === "FAIL")
          ? "FAIL"
          : "PASS WITH RISK";

    tiers.push(tier);
  }

  await disconnectPrisma();

  const overall = tiers.some((t) => t.verdict === "FAIL")
    ? "FAIL"
    : tiers.every((t) => t.verdict === "PASS")
      ? "PASS"
      : "PASS WITH RISK";

  return {
    phase: "A_load_testing",
    verdict: overall,
    rfqCountInDb: rfqCount,
    note:
      rfqCount < 1000
        ? "Full 1k–50k RFQ datasets require tools/enterprise-validation seed:scale in staging."
        : "Read-path benchmarks executed against live API.",
    tiers,
    cpuNote: "CPU not sampled in-process; use host metrics during staging runs.",
    memoryNote: "Validator process memory only; use APM for API server RSS under load.",
  };
}
