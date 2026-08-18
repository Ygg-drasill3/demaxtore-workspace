#!/usr/bin/env node
import { writeResults } from "./lib/results-io.mjs";
import { runLoadTest } from "./phases/load-test.mjs";
import { runConcurrencyTest } from "./phases/concurrency-test.mjs";
import { runDbPerformance } from "./phases/db-performance.mjs";
import { runMultiInstanceVerification } from "./phases/multi-instance.mjs";
import { runJobReliability } from "./phases/job-reliability.mjs";
import { runDisasterRecovery } from "./phases/disaster-recovery.mjs";
import { runChaosTest } from "./phases/chaos-test.mjs";
import { runSoakTest } from "./phases/soak-test.mjs";
import { runObservability } from "./phases/observability.mjs";

const phases = [
  ["A", runLoadTest],
  ["B", runConcurrencyTest],
  ["C", runDbPerformance],
  ["D", runMultiInstanceVerification],
  ["E", runJobReliability],
  ["F", runDisasterRecovery],
  ["G", runChaosTest],
  ["H", runSoakTest],
  ["I", runObservability],
];

console.log("DeMaxtore Sprint 9 — Enterprise Validation\n");

const results = { phases: {} };

for (const [label, fn] of phases) {
  process.stdout.write(`Running phase ${label}… `);
  try {
    const out = await fn();
    results.phases[out.phase] = out;
    console.log(out.verdict);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.phases[`${label}_error`] = { verdict: "FAIL", error: msg };
    console.log(`FAIL (${msg})`);
  }
}

const verdicts = Object.values(results.phases).map((p) => p.verdict);
results.summary = {
  pass: verdicts.filter((v) => v === "PASS").length,
  passWithRisk: verdicts.filter((v) => v === "PASS WITH RISK").length,
  fail: verdicts.filter((v) => v === "FAIL").length,
};

const payload = await writeResults(results);
console.log(`\nResults written to tools/enterprise-validation/results/latest.json`);
console.log(`Summary: ${payload.summary.pass} PASS, ${payload.summary.passWithRisk} PASS WITH RISK, ${payload.summary.fail} FAIL`);
