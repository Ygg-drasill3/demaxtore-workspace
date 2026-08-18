import { timedFetch } from "../lib/http-client.mjs";
import { memSnapshot } from "../lib/metrics.mjs";
import { SOAK_DURATION_MS } from "../lib/config.mjs";

export async function runSoakTest() {
  const intervalMs = 5_000;
  const samples = [];
  const startMem = memSnapshot();
  const endAt = Date.now() + SOAK_DURATION_MS;

  while (Date.now() < endAt) {
    const r = await timedFetch("/api/healthz");
    samples.push({
      at: new Date().toISOString(),
      ms: r.ms,
      ok: r.ok,
      mem: memSnapshot(),
    });
    await new Promise((res) => setTimeout(res, intervalMs));
  }

  const endMem = memSnapshot();
  const heapGrowth = endMem.heapUsedMb - startMem.heapUsedMb;
  const errors = samples.filter((s) => !s.ok).length;
  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

  const verdict =
    errors > samples.length * 0.01
      ? "FAIL"
      : heapGrowth > 100
        ? "PASS WITH RISK"
        : SOAK_DURATION_MS < 3_600_000
          ? "PASS WITH RISK"
          : "PASS";

  return {
    phase: "H_soak_testing",
    verdict,
    durationMs: SOAK_DURATION_MS,
    durationLabel:
      SOAK_DURATION_MS >= 86_400_000 ? "24h" : `${Math.round(SOAK_DURATION_MS / 60_000)}m sample`,
    sampleCount: samples.length,
    errors,
    latencyP95: p95,
    memoryStart: startMem,
    memoryEnd: endMem,
    heapGrowthMb: heapGrowth,
    leakSuspected: heapGrowth > 50,
    full24hProcedure:
      "Run EV_SOAK_MS=86400000 with host-level CPU/RSS monitoring and job_executions growth watch.",
  };
}
