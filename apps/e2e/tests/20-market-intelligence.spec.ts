// Sprint 7C — Market intelligence & opportunity engine
import { test, expect } from "@playwright/test";
import {
  USERS, apiLogin, newRequest, API_BASE,
  runControlTowerScan, findOpenAlert,
} from "./_helpers";

test.describe("Market intelligence (Sprint 7C)", () => {
  test("01 — Category trends visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ category: string; opportunityScore: number; trend: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
    if (rows.length) {
      expect(rows[0].opportunityScore).toBeGreaterThanOrEqual(0);
      expect(["growing", "declining", "stable"]).toContain(rows[0].trend);
    }
  });

  test("02 — Country demand visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/countries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ country: string; demandScore: number }>;
    expect(Array.isArray(rows)).toBeTruthy();
    if (rows.length) expect(rows[0].demandScore).toBeLessThanOrEqual(100);
  });

  test("03 — Supply gaps visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/supply-gaps`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ opportunityScore: number; category: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test("04 — Route opportunities visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/routes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ lane: string; opportunityScore: number }>;
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test("05 — Buyer opportunities visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/buyers/opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("06 — Forwarder opportunities visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/forwarders/opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ classification: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
    if (rows.length) {
      expect(["Underutilized", "Emerging", "Core Partner", "Strategic Partner"]).toContain(
        rows[0].classification,
      );
    }
  });

  test("07 — Recommendations visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/recommendations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ action: string; reason: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test("08 — Top opportunities ranking visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ score: number; type: string }>;
    expect(Array.isArray(rows)).toBeTruthy();
    if (rows.length >= 2) expect(rows[0].score).toBeGreaterThanOrEqual(rows[1].score);
  });

  test("09 — CSV exports work", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const csv = await req.get(`${API_BASE}/api/market/export/recommendations.csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(csv.ok()).toBeTruthy();
    expect(await csv.text()).toContain("action");
  });

  test("10 — Role isolation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const denied = await req.get(`${API_BASE}/api/market/insights`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(denied.status()).toBe(403);
  });

  test("11 — Market dashboard API (insights)", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/market/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { generatedAt: string; topOpportunities: unknown[] };
    expect(body.generatedAt).toBeTruthy();
    expect(Array.isArray(body.topOpportunities)).toBeTruthy();
  });

  test("12 — Control Tower market alerts scan", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const alertsRes = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(alertsRes.ok()).toBeTruthy();
    const list = await alertsRes.json() as { items?: Array<{ alertKey: string; workspaceId: string }> };
    const rows = list.items ?? [];
    const marketAlert = rows.find((a) => a.alertKey.startsWith("market."));
    if (marketAlert) {
      const found = await findOpenAlert(req, adminToken, {
        workspaceId: marketAlert.workspaceId,
        alertKey: marketAlert.alertKey,
      });
      expect(found?.alertKey).toBe(marketAlert.alertKey);
    }
  });
});
