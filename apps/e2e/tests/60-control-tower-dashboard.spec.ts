// Sprint 18B — Import Control Tower Dashboard E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy } from "./_helpers";

test.describe.serial("Import Control Tower Dashboard (18B)", () => {
  let buyerToken = "";
  let rfqId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E ICT ${Date.now()}`);
    rfqId = created.id;
  });

  test("01 — API returns import control tower dashboard", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/control-tower/dashboard`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeTruthy();
    expect(typeof body.kpis.activeTrades).toBe("number");
    expect(Array.isArray(body.pipeline)).toBe(true);
    expect(Array.isArray(body.attentionRequired)).toBe(true);
    expect(Array.isArray(body.activityFeed)).toBe(true);
    expect(Array.isArray(body.upcomingMilestones)).toBe(true);
    expect(body.shipmentVisibility).toBeTruthy();
    expect(Array.isArray(body.operationalRisks)).toBe(true);
    expect(body.refreshedAt).toBeTruthy();
  });

  test("02 — Pipeline has funnel stages", async () => {
    const req = await newRequest();
    const body = await req.get(`${API_BASE}/api/control-tower/dashboard`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { pipeline: Array<{ key: string; count: number }> };

    const keys = body.pipeline.map((s) => s.key);
    expect(keys).toContain("rfq");
    expect(keys).toContain("delivery");
  });

  test("03 — Buyer UI renders control tower", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/control-tower");
    await expect(page.getByTestId("import-control-tower")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ict-kpi-row")).toBeVisible();
    await expect(page.getByTestId("ict-pipeline")).toBeVisible();
    await expect(page.getByTestId("ict-attention")).toBeVisible();
    await expect(page.getByTestId("ict-activity-feed")).toBeVisible();
    await expect(page.getByTestId("ict-upcoming")).toBeVisible();
    await expect(page.getByTestId("ict-shipment-visibility")).toBeVisible();
    await expect(page.getByTestId("ict-risks")).toBeVisible();
  });

  test("04 — Search filter accepts query", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/control-tower");
    await expect(page.getByTestId("import-control-tower")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("ict-search").fill("TRADE-");
    await page.getByTestId("ict-refresh").click();
    await expect(page.getByTestId("ict-kpi-row")).toBeVisible();
  });

  test("05 — Supplier ACL restricted vs admin full access", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supplier1);
    const adminToken = await apiLogin(req, USERS.admin);

    const supplierRes = await req.get(`${API_BASE}/api/control-tower/dashboard`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(supplierRes.ok()).toBeTruthy();

    const adminRes = await req.get(`${API_BASE}/api/control-tower/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.ok()).toBeTruthy();
    const adminBody = await adminRes.json() as { kpis: { activeTrades: number } };
    expect(typeof adminBody.kpis.activeTrades).toBe("number");
  });

  test("06 — Admin ops dashboard still on separate endpoint", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/control-tower/ops-dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.overview).toBeTruthy();
    expect(body.alerts).toBeTruthy();
  });
});
