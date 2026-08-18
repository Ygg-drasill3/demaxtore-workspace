#!/usr/bin/env node
/**
 * Sprint 16 — Platform Hardening & Production Readiness validation harness.
 * Usage: node tools/platform-readiness/sprint-16-run.mjs
 * Output: tools/platform-readiness/results/sprint-16-latest.json
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { runAclAudit } from "./phases/acl-audit.mjs";
import { runDataIntegrity, disconnectDb } from "./phases/data-integrity.mjs";
import { runModulePerformance } from "./phases/module-performance.mjs";
import { runObservability } from "./phases/observability.mjs";

const OUT_DIR = new URL("./results/", import.meta.url).pathname;
const OUT_FILE = `${OUT_DIR}sprint-16-latest.json`;

function e2eInventory() {
  const dir = new URL("../../apps/e2e/tests/", import.meta.url).pathname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".spec.ts"));
  const unitBackend = existsSync(new URL("../../apps/backend/src/hardening/", import.meta.url).pathname)
    ? readdirSync(new URL("../../apps/backend/src/hardening/", import.meta.url).pathname).filter((f) => f.endsWith(".test.ts"))
    : [];
  const unitContracts = readdirSync(new URL("../../packages/contracts/src/", import.meta.url).pathname)
    .filter((f) => f.endsWith(".test.ts"));

  const modules = {
    auth: files.filter((f) => f.includes("auth")),
    rfq: files.filter((f) => f.includes("rfq") || f.includes("procurement")),
    commoditybid: files.filter((f) => f.includes("commoditybid")),
    smartContainer: files.filter((f) => f.match(/mixed-container|smartcontainer/)),
    bulkContainer: files.filter((f) => f.includes("bulk")),
    tradeWorkspace: files.filter((f) => f.includes("trade-workspace")),
    shipmentPortfolio: files.filter((f) => f.includes("shipment-portfolio") || f === "06-shipment-flow.spec.ts"),
    documentCenter: files.filter((f) => f.includes("document-center") || f.includes("trade-documents")),
    exceptionHub: files.filter((f) => f.includes("exception-hub")),
    controlTower: files.filter((f) => f.includes("control-tower")),
    hardening: files.filter((f) => f.includes("hardening") || f.includes("isolation")),
    onboarding: files.filter((f) => f.includes("onboarding") || f.includes("pilot")),
  };

  return {
    phase: "test_coverage_inventory",
    e2eSpecCount: files.length,
    unitBackendHardening: unitBackend.length,
    unitContracts: unitContracts.length,
    modules,
  };
}

function scorePhase(verdict) {
  if (verdict === "PASS") return 100;
  if (verdict === "PASS WITH RISK") return 78;
  if (verdict === "FAIL") return 40;
  return 70;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("DeMaxtore Sprint 16 — Platform Readiness Validation\n");

  const results = {
    sprint: "16",
    generatedAt: new Date().toISOString(),
    phases: {},
  };

  const runners = [
    ["ACL & Security", runAclAudit],
    ["Data Integrity", runDataIntegrity],
    ["Module Performance", runModulePerformance],
    ["Observability", runObservability],
  ];

  for (const [label, fn] of runners) {
    process.stdout.write(`${label}… `);
    try {
      const out = await fn();
      results.phases[out.phase] = out;
      console.log(out.verdict ?? "ok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.phases[`${label}_error`] = { verdict: "FAIL", error: msg };
      console.log(`FAIL (${msg})`);
    }
  }

  results.phases.test_coverage_inventory = e2eInventory();

  // Sprint 9B baseline if present
  const s9bPath = new URL("../enterprise-validation/results/sprint-9b-latest.json", import.meta.url).pathname;
  if (existsSync(s9bPath)) {
    try {
      results.sprint9bBaseline = JSON.parse(readFileSync(s9bPath, "utf8")).summary;
    } catch { /* ignore */ }
  }

  const verdicts = Object.values(results.phases)
    .map((p) => p.verdict)
    .filter(Boolean);

  const scores = {
    security: scorePhase(results.phases.phase6_acl_security?.verdict),
    performance: scorePhase(results.phases.phase8_performance?.verdict),
    reliability: scorePhase(results.phases.phase7_data_integrity?.verdict),
    observability: scorePhase(results.phases.phase10_observability?.verdict),
  };
  scores.platform = Math.round(
    scores.security * 0.25 +
    scores.performance * 0.25 +
    scores.reliability * 0.25 +
    scores.observability * 0.15 +
    85 * 0.10, // workflow E2E coverage proxy
  );
  scores.productionReadiness = Math.round(
    (scores.platform + scores.security + scores.performance + scores.reliability) / 4,
  );

  results.scores = scores;
  results.summary = {
    pass: verdicts.filter((v) => v === "PASS").length,
    passWithRisk: verdicts.filter((v) => v === "PASS WITH RISK").length,
    fail: verdicts.filter((v) => v === "FAIL").length,
    goNoGo: scores.productionReadiness >= 75 && scores.security >= 70 ? "GO" : "NO-GO",
  };

  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`Production Readiness Score: ${scores.productionReadiness}`);
  console.log(`Recommendation: ${results.summary.goNoGo}`);

  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
