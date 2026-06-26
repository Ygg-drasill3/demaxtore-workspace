// Sprint 7A — Commercial scale readiness
import { test, expect } from "@playwright/test";
import {
  USERS, apiLogin, newRequest, API_BASE,
  runControlTowerScan, findOpenAlert,
} from "./_helpers";

const PIPELINE_STALLED = "pipeline.stalled";

test.describe.serial("Commercial scale readiness (Sprint 7A)", () => {
  let buyerOrgId = "";
  let adminUserId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const me = await req.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { id: string };
    adminUserId = me.id;
    const buyers = await req.get(`${API_BASE}/api/scale/portfolio/buyers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as Array<{ organisationId: string; organisationName: string }>;
    expect(buyers.length).toBeGreaterThan(0);
    buyerOrgId = buyers[0].organisationId;
  });

  test("01 — Buyer health visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyers = await req.get(`${API_BASE}/api/scale/portfolio/buyers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(buyers.ok()).toBeTruthy();
    const rows = await buyers.json() as Array<{ commercialScore: number; rfqCount: number }>;
    expect(rows[0].commercialScore).toBeGreaterThanOrEqual(0);
    expect(rows[0].commercialScore).toBeLessThanOrEqual(100);
  });

  test("02 — Supplier health visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/scale/portfolio/suppliers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ organisationName: string }>;
    expect(rows.length).toBeGreaterThan(0);
  });

  test("03 — Account assignment", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const assign = await req.post(`${API_BASE}/api/scale/accounts/${buyerOrgId}/assign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        operationsUserId: adminUserId,
        salesUserId: adminUserId,
      },
    });
    expect(assign.ok()).toBeTruthy();
    const body = await assign.json() as { operationsUserId: string; salesUserId: string };
    expect(body.operationsUserId).toBe(adminUserId);
    expect(body.salesUserId).toBe(adminUserId);
  });

  test("04 — Pipeline health", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/scale/pipeline/health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { averageHealthScore: number; items: unknown[] };
    expect(body.averageHealthScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test("05 — Pipeline health alerts scan", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const pipe = await req.get(`${API_BASE}/api/scale/pipeline/health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { items: Array<{ workspaceId: string; stalled: boolean }> };
    const stalled = pipe.items.find((i) => i.stalled);
    if (stalled) {
      const alert = await findOpenAlert(req, adminToken, {
        workspaceId: stalled.workspaceId,
        alertKey: PIPELINE_STALLED,
      });
      expect(alert).toBeTruthy();
    }
  });

  test("06 — Revenue forecast", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    for (const days of [30, 60, 90]) {
      const res = await req.get(`${API_BASE}/api/scale/forecast?days=${days}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.ok()).toBeTruthy();
      const f = await res.json() as { horizonDays: number; expectedFreightiqRevenueUsd: number };
      expect(f.horizonDays).toBe(days);
      expect(typeof f.expectedFreightiqRevenueUsd).toBe("number");
    }
  });

  test("07 — Operator workload", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/scale/workload`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json() as Array<{ email: string; totalLoad: number }>;
    expect(rows.some((r) => r.email === USERS.admin.email)).toBeTruthy();
  });

  test("08 — Executive dashboard", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/scale/executive`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const e = await res.json() as { openRfqs: number; revenueForecast30d: { expectedFreightiqRevenueUsd: number } };
    expect(e.openRfqs).toBeGreaterThanOrEqual(0);
    expect(e.revenueForecast30d.expectedFreightiqRevenueUsd).toBeGreaterThanOrEqual(0);
  });

  test("09 — CSV export", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const csv = await req.get(`${API_BASE}/api/scale/export/customers.csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(csv.ok()).toBeTruthy();
    const text = await csv.text();
    expect(text).toContain("organisation");
  });

  test("10 — Role isolation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const denied = await req.get(`${API_BASE}/api/scale/executive`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(denied.status()).toBe(403);
  });
});
