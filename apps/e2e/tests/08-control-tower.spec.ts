// Sprint 4A — Control Tower E2E
import { test, expect } from "@playwright/test";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfq, runControlTowerScan, findOpenAlert, ageWorkspaceBackdate,
} from "./_helpers";

test.describe("Control Tower (Sprint 4A)", () => {
  test("01 — Admin operations dashboard opens", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/operations");
    await expect(page.getByTestId("operations-page")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("operations-kpis")).toBeVisible();
    await expect(page.getByTestId("sla-dashboard")).toBeVisible();
    await page.getByTestId("supplier-performance").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("supplier-performance")).toBeVisible();
    await page.getByTestId("buyer-performance").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("buyer-performance")).toBeVisible();
  });

  test("02 — Alert appears after scan for stale submitted RFQ", async ({ page }) => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    const { id: rfqId } = await setupSubmittedRfq(
      req,
      buyerToken,
      `Control Tower stale RFQ ${Date.now()}`,
      { productCategory: "Industrial" },
    );

    ageWorkspaceBackdate(rfqId, 25);

    await runControlTowerScan(req, adminToken);
    const hit = await findOpenAlert(req, adminToken, {
      workspaceId: rfqId,
      alertKey: "rfq_submitted_unassigned",
    });
    expect(hit).toBeTruthy();

    await uiLogin(page, USERS.admin);
    await page.goto("/operations");
    await page.getByTestId("open-alerts").scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`alert-row-${hit!.id}`)).toBeVisible({ timeout: 15_000 });
  });

  test("03 — Admin resolves alert", async ({ page }) => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const list = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const { items } = await list.json() as { items: Array<{ id: string }> };
    test.skip(items.length === 0, "No open alerts to resolve");

    await uiLogin(page, USERS.admin);
    await page.goto("/operations");
    await page.getByTestId(`resolve-alert-${items[0].id}`).click();
    await expect(page.getByTestId(`alert-row-${items[0].id}`)).toBeHidden({ timeout: 8_000 });

    const again = await req.get(`${API_BASE}/api/control-tower/alerts/${items[0].id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alert = await again.json() as { resolvedAt: string | null };
    expect(alert.resolvedAt).not.toBeNull();
  });

  test("04 — Metrics visible via API", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/control-tower/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const metrics = await res.json() as Array<{ key: string; value: number }>;
    expect(metrics.some((m) => m.key === "open_alerts")).toBeTruthy();
  });

  test("05 — Role isolation: buyer cannot access control tower", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${API_BASE}/api/control-tower/overview`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
