import { login, timedFetch, authHeaders } from "../lib/http-client.mjs";
import { summarize, verdictFromLatency } from "../lib/metrics.mjs";
import { USERS } from "../lib/config.mjs";

const LEVELS = [250, 500, 1000];
const BATCH_SIZE = 50;

const WORKLOADS = [
  { role: "admin", name: "system_health", path: "/api/system/health", auth: true },
  { role: "buyer", name: "rfq_list", path: "/api/rfq?limit=20", auth: true },
  { role: "supplier", name: "healthz", path: "/api/healthz", auth: false },
];

async function runBatched(total, tokens) {
  const results = [];
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, total - offset);
    const batch = [];
    for (let i = 0; i < size; i++) {
      const n = offset + i;
      const w = WORKLOADS[n % WORKLOADS.length];
      const headers = w.auth ? authHeaders(tokens[w.role]) : {};
      batch.push(
        timedFetch(w.path, { headers }).then((r) => ({ ...r, workload: w.name, role: w.role })),
      );
    }
    const chunk = await Promise.all(batch);
    results.push(...chunk);
    await new Promise((r) => setTimeout(r, 25));
  }
  return results;
}

/** Sprint 9B — batched concurrency (reduces client-side socket exhaustion). */
export async function runConcurrencyBatched() {
  const tokens = {
    admin: await login(USERS.admin.email, USERS.admin.password),
    buyer: await login(USERS.buyer1.email, USERS.buyer1.password),
    supplier: await login(USERS.supplier1.email, USERS.supplier1.password),
  };

  const levels = [];
  for (const users of LEVELS) {
    const results = await runBatched(users, tokens);
    const latencies = results.map((r) => r.ms);
    const stats = summarize(latencies);
    const hardFailures = results.filter((r) => !r.ok && r.status === 0);
    stats.errors = hardFailures.length;
    stats.httpErrors = results.filter((r) => !r.ok && r.status > 0).length;
    stats.verdict =
      stats.errors > users * 0.05
        ? "FAIL"
        : stats.errors > 0 || stats.p95 > 2000
          ? "PASS WITH RISK"
          : "PASS";
    levels.push({
      concurrentUsers: users,
      batchSize: BATCH_SIZE,
      stats,
      sampleErrors: hardFailures.slice(0, 5),
    });
  }

  const overall = levels.some((l) => l.stats.verdict === "FAIL")
    ? "FAIL"
    : levels.every((l) => l.stats.verdict === "PASS")
      ? "PASS"
      : "PASS WITH RISK";

  return {
    phase: "A_concurrency_batched",
    verdict: overall,
    note: "Batched client requests (50 at a time). Compare with unbatched Sprint 9 B_concurrency for burst behavior.",
    levels,
  };
}
