import { login, benchEndpoint, auth, timedFetch } from "../lib/http.mjs";

const BUYER = { email: "buyer1@acme.test", password: "Passw0rd!" };
const SAMPLES = Number(process.env.PR_PERF_SAMPLES ?? 8);

export async function runModulePerformance() {
  const token = await login(BUYER.email, BUYER.password);

  const rfqList = await timedFetch("/api/rfq?limit=1", { headers: auth(token) });
  const tradeId = rfqList.body?.items?.[0]?.id;

  const endpoints = [
    "/api/exceptions?limit=25",
    "/api/documents?limit=25",
    "/api/shipments/portfolio?limit=25",
    ...(tradeId ? [`/api/trades/${tradeId}/workspace`] : []),
    ...(tradeId ? [`/api/trades/${tradeId}/documents`] : []),
    ...(tradeId ? [`/api/trades/${tradeId}/exceptions`] : []),
    "/api/exceptions?limit=25&search=TRADE",
    "/api/documents?limit=25&status=Missing",
    "/api/shipments/portfolio?limit=25&status=At%20Risk",
  ];

  const results = [];
  for (const path of endpoints) {
    results.push(await benchEndpoint(token, path, SAMPLES));
  }

  const under1s = results.filter((r) => r.p95 <= 1000);
  const slow = results.filter((r) => r.p95 > 1000);

  return {
    phase: "phase8_performance",
    verdict: slow.length === 0 ? "PASS" : slow.length <= 2 ? "PASS WITH RISK" : "FAIL",
    tradeCountProxy: rfqList.body?.total ?? rfqList.body?.items?.length ?? null,
    samplesPerEndpoint: SAMPLES,
    target: "p95 <= 1000ms",
    results,
    p95Under1sRate: results.length ? under1s.length / results.length : 0,
    slowEndpoints: slow.map((s) => ({ path: s.path, p95: s.p95 })),
  };
}
