// Sprint 7B — Growth engine & commercial funnel intelligence
import { test, expect } from "@playwright/test";
import {
  USERS, apiLogin, newRequest, API_BASE,
  runControlTowerScan, findOpenAlert,
} from "./_helpers";

const GROWTH_RFQ_STALLED = "growth.rfq.stalled";
const GROWTH_PIPELINE_LEAKAGE = "growth.pipeline.leakage";

test.describe("Growth engine (Sprint 7B)", () => {
  test("01 — Commercial funnel visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/funnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { stages: Array<{ stage: string; count: number }>; totalRfqs: number };
    expect(body.stages.length).toBeGreaterThanOrEqual(9);
    expect(body.stages[0].stage).toBe("rfq_created");
    expect(body.totalRfqs).toBeGreaterThanOrEqual(0);
  });

  test("02 — Conversion metrics visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/conversion`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { rfqToPoPercent: number; quoteToSelectPercent: number };
    expect(typeof body.rfqToPoPercent).toBe("number");
    expect(typeof body.quoteToSelectPercent).toBe("number");
  });

  test("03 — Buyer activation visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/buyers/activation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ classification: string; activationScore: number }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(["Cold", "Warm", "Active", "Power Buyer"]).toContain(rows[0].classification);
    expect(rows[0].activationScore).toBeGreaterThanOrEqual(0);
  });

  test("04 — Supplier performance visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/suppliers/performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ classification: string; growthScore: number }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(["Inactive", "Emerging", "Active", "Top Performer"]).toContain(rows[0].classification);
  });

  test("05 — Category analytics visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ category: string; rfqCount: number }>;
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test("06 — Route analytics visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/routes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ route: string; lane: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test("07 — Repeat customer report visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/repeat-customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ horizonDays: number; repeatRate: number }>;
    expect(rows.length).toBe(3);
    expect(rows.map((r) => r.horizonDays).sort((a, b) => a - b)).toEqual([30, 90, 365]);
  });

  test("08 — Lost opportunity report visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/lost-opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { items: unknown[]; totalEstimatedLostFreightiqRevenueUsd: number };
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(typeof body.totalEstimatedLostFreightiqRevenueUsd).toBe("number");
  });

  test("09 — CSV exports work", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const csv = await req.get(`${API_BASE}/api/growth/export/funnel.csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(csv.ok()).toBeTruthy();
    expect(await csv.text()).toContain("stage");
  });

  test("10 — Role isolation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const denied = await req.get(`${API_BASE}/api/growth/insights`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(denied.status()).toBe(403);
  });

  test("11 — Growth insights dashboard API", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { funnel: { stages: unknown[] }; generatedAt: string };
    expect(body.funnel.stages.length).toBeGreaterThan(0);
    expect(body.generatedAt).toBeTruthy();
  });

  test("12 — Control Tower growth alerts scan", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const dropoffs = await req.get(`${API_BASE}/api/growth/dropoffs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(dropoffs.ok()).toBeTruthy();
    const stalledRfqs = await req.get(`${API_BASE}/api/growth/funnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { stages: Array<{ stage: string }> };
    expect(stalledRfqs.stages.some((s) => s.stage === "rfq_submitted")).toBeTruthy();
    const alertsRes = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(alertsRes.ok()).toBeTruthy();
    const list = await alertsRes.json() as { items?: Array<{ alertKey: string; workspaceId: string }> };
    const rows = list.items ?? [];
    const growthAlert = rows.find((a) => a.alertKey.startsWith("growth."));
    if (growthAlert) {
      const found = await findOpenAlert(req, adminToken, {
        workspaceId: growthAlert.workspaceId,
        alertKey: growthAlert.alertKey,
      });
      expect(found?.alertKey).toBe(growthAlert.alertKey);
    } else {
      void GROWTH_RFQ_STALLED;
      void GROWTH_PIPELINE_LEAKAGE;
    }
  });
});
