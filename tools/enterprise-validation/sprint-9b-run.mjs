#!/usr/bin/env node
/**
 * Sprint 9B — Hardening validation orchestrator (no app feature changes).
 */
import { writeResults } from "./lib/results-io.mjs";
import { runPoolReview } from "./phases/pool-review.mjs";
import { runConcurrencyBatched } from "./phases/concurrency-batched.mjs";
import { runLoadTest } from "./phases/load-test.mjs";
import { runDbPerformance } from "./phases/db-performance.mjs";
import { runMultiInstanceVerification } from "./phases/multi-instance.mjs";
import { runJobReliability } from "./phases/job-reliability.mjs";
import { runDisasterRecovery } from "./phases/disaster-recovery.mjs";
import { runSoakTest } from "./phases/soak-test.mjs";
import { runObservability } from "./phases/observability.mjs";

const QUICK = process.env.EV9B_QUICK === "1";
const OUT = new URL("./results/sprint-9b-latest.json", import.meta.url).pathname;

async function runJobReconcileProbe() {
  const { login, timedFetch, authHeaders } = await import("./lib/http-client.mjs");
  const { USERS } = await import("./lib/config.mjs");
  const token = await login(USERS.admin.email, USERS.admin.password);
  const stuck = await timedFetch("/api/system/jobs/stuck-running", { headers: authHeaders(token) });
  const reconcile = await timedFetch("/api/system/jobs/reconcile-stale", {
    method: "POST",
    headers: authHeaders(token),
  });
  const verdict =
    reconcile.ok && stuck.ok
      ? "PASS"
      : reconcile.ok
        ? "PASS WITH RISK"
        : "FAIL";
  return {
    phase: "C_stale_job_recovery",
    verdict,
    stuckRunning: stuck.body,
    reconcile: reconcile.body,
    reconcileMs: reconcile.ms,
  };
}

const phases = [
  ["A-pool", runPoolReview],
  ["A-concurrency", runConcurrencyBatched],
  ["F-load", runLoadTest],
  ["F-db", runDbPerformance],
  ["C-jobs", runJobReconcileProbe],
  ["E-multi", runMultiInstanceVerification],
  ["E-jobs", runJobReliability],
  ["D-dr", runDisasterRecovery],
  ...(QUICK ? [] : [["G-soak", runSoakTest]]),
  ["I-obs", runObservability],
];

console.log("DeMaxtore Sprint 9B — Hardening Validation\n");

const results = { sprint: "9B", phases: {}, generatedAt: new Date().toISOString() };

for (const [label, fn] of phases) {
  process.stdout.write(`Running ${label}… `);
  try {
    const out = await fn();
    const key = out.phase ?? label;
    results.phases[key] = out;
    console.log(out.verdict ?? "ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.phases[`${label}_error`] = { verdict: "FAIL", error: msg };
    console.log(`FAIL (${msg})`);
  }
}

const verdicts = Object.values(results.phases).map((p) => p.verdict).filter(Boolean);
results.summary = {
  pass: verdicts.filter((v) => v === "PASS").length,
  passWithRisk: verdicts.filter((v) => v === "PASS WITH RISK").length,
  fail: verdicts.filter((v) => v === "FAIL").length,
};

await writeResults(results, OUT);
console.log(`\nResults: tools/enterprise-validation/results/sprint-9b-latest.json`);
console.log(`Summary: ${results.summary.pass} PASS, ${results.summary.passWithRisk} PASS WITH RISK, ${results.summary.fail} FAIL`);
