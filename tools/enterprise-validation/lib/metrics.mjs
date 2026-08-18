export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function summarize(samples) {
  if (!samples.length) {
    return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, errors: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: samples.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / samples.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    errors: 0,
  };
}

export function verdictFromLatency(p95Ms, { pass = 500, risk = 2000 } = {}) {
  if (p95Ms <= pass) return "PASS";
  if (p95Ms <= risk) return "PASS WITH RISK";
  return "FAIL";
}

export function memSnapshot() {
  const m = process.memoryUsage();
  return {
    rssMb: Math.round(m.rss / 1024 / 1024),
    heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(m.heapTotal / 1024 / 1024),
    externalMb: Math.round(m.external / 1024 / 1024),
  };
}
