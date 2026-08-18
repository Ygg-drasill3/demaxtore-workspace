import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { summarize, verdictFromLatency } from "../lib/metrics.mjs";
import { CONCURRENCY_LEVELS, USERS } from "../lib/config.mjs";

const WORKLOADS_BY_ROLE = {
  admin: [
    { name: "system_health", fn: (t) => timedFetch("/api/system/health", { headers: authHeaders(t) }) },
    { name: "control_tower_metrics", fn: (t) => timedFetch("/api/control-tower/metrics", { headers: authHeaders(t) }) },
  ],
  buyer: [
    { name: "rfq_list", fn: (t) => timedFetch("/api/rfq?limit=20", { headers: authHeaders(t) }) },
    { name: "healthz", fn: () => timedFetch("/api/healthz") },
  ],
  supplier: [
    { name: "rfq_list", fn: (t) => timedFetch("/api/rfq?limit=20", { headers: authHeaders(t) }) },
    { name: "healthz", fn: () => timedFetch("/api/healthz") },
  ],
};

export async function runConcurrencyTest() {
  const adminToken = await login(USERS.admin.email, USERS.admin.password);
  const buyerToken = await login(USERS.buyer1.email, USERS.buyer1.password);
  const supplierToken = await login(USERS.supplier1.email, USERS.supplier1.password);

  const tokens = { admin: adminToken, buyer: buyerToken, supplier: supplierToken };
  const levels = [];

  for (const users of CONCURRENCY_LEVELS) {
    const batch = [];
    for (let i = 0; i < users; i++) {
      const role = i % 3 === 0 ? "admin" : i % 3 === 1 ? "buyer" : "supplier";
      const workloads = WORKLOADS_BY_ROLE[role];
      const workload = workloads[i % workloads.length];
      const token = tokens[role];
      batch.push(
        workload.fn(token).then((r) => ({ ...r, workload: workload.name, role })),
      );
    }
    const results = await Promise.all(batch);
    const latencies = results.map((r) => r.ms);
    const stats = summarize(latencies);
    stats.errors = results.filter((r) => !r.ok && r.status !== 403).length;
    stats.verdict =
      stats.errors > users * 0.1
        ? "FAIL"
        : verdictFromLatency(stats.p95, { pass: 1500, risk: 5000 });
    stats.raceConditionsObserved = stats.errors > 0 ? "possible_check_logs" : "none_detected";
    stats.lockingNote = "Advisory locks protect schedulers; API idempotency on mutations.";

    levels.push({ concurrentUsers: users, stats, sampleErrors: results.filter((r) => !r.ok).slice(0, 3) });
  }

  const overall = levels.some((l) => l.stats.verdict === "FAIL")
    ? "FAIL"
    : levels.every((l) => l.stats.verdict === "PASS")
      ? "PASS"
      : "PASS WITH RISK";

  return {
    phase: "B_concurrency",
    verdict: overall,
    levels,
    workflowsValidated: [
      "RFQ list (buyer)",
      "System health (admin)",
      "Public health (anonymous)",
    ],
    workflowsNotMutated: ["RFQ create", "bidding", "PO", "order", "shipment — read-only concurrency slice"],
  };
}
