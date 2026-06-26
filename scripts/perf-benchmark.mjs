#!/usr/bin/env node
/**
 * Backend admin endpoint benchmark — logs response times for key analytics routes.
 * Usage: PERF_BENCH_TOKEN=<admin-jwt> node scripts/perf-benchmark.mjs
 */
const base = process.env.PERF_BENCH_URL ?? "http://127.0.0.1:3001/api";
const token = process.env.PERF_BENCH_TOKEN;

if (!token) {
  console.error("Set PERF_BENCH_TOKEN to an admin JWT");
  process.exit(1);
}

const endpoints = [
  "/control-tower/overview",
  "/control-tower/dashboard",
  "/control-tower/supplier-performance",
  "/growth/insights",
  "/growth/funnel",
  "/onboarding/users",
];

async function bench(path) {
  const start = performance.now();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ms = Math.round(performance.now() - start);
  const body = await res.text();
  return { path, status: res.status, ms, bytes: body.length };
}

console.log(`Benchmark base: ${base}\n`);
const results = [];
for (const path of endpoints) {
  results.push(await bench(path));
}

console.table(results);
const slow = results.filter((r) => r.ms > 1000);
if (slow.length) {
  console.warn("\nEndpoints over 1s:", slow.map((s) => s.path).join(", "));
}
