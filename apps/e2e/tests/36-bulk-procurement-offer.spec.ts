// Sprint 13C — BulkContainer procurement & offer E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";
import { execSync } from "node:child_process";

test.describe.serial("BulkContainer procurement & offer (Sprint 13C)", () => {
  let containerId = "";
  let offerId = "";
  let buyerToken = "";
  let adminToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
  });

  test("01 — Buyer submits bulk procurement request", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog/wheat-flour");
    await page.getByTestId("bc-add-spec-BC-FLOUR-001").click();
    await page.getByTestId("bc-packing-option-PT-BC-FLOUR-25KG").click();
    await page.getByTestId("bc-spec-protein").fill("12");
    await page.getByTestId("bc-spec-ash").fill("0.55");
    await page.getByTestId("bc-spec-moisture").fill("14");
    await page.getByTestId("bc-spec-wetGluten").fill("28");
    await page.locator('[data-testid="bc-spec-packing"]').selectOption({ index: 1 });
    await page.locator('[data-testid="bc-spec-origin"]').selectOption({ index: 1 });
    await page.getByTestId("bc-mt-quantity").fill("10");
    await page.getByTestId("bc-add-confirm").click();
    await page.waitForURL(/\/buyer\/bulk-container\/requests\//, { timeout: 15000 });
    containerId = page.url().split("/").pop()!;
    await page.getByTestId("bc-submit-request").click();
    await expect(page.getByTestId("bc-request-submitted")).toBeVisible({ timeout: 10000 });
  });

  test("02 — Operations inbox receives request", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/bulk-container");
    await expect(page.getByTestId("bc-admin-inbox-page")).toBeVisible();
    await expect(page.getByTestId("bc-admin-kpis")).toBeVisible();
    await expect(page.getByTestId(/bc-inbox-row-BC-/).first()).toBeVisible();
  });

  test("03 — Operations enters pricing and creates offer", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/bulk-container/procurement/${containerId}`);
    await expect(page.getByTestId("bc-procurement-page")).toBeVisible();
    await page.getByTestId("bc-start-procurement").click();
    await expect(page.getByTestId("bc-procurement-pricing")).toBeVisible();
    await page.getByTestId(/bc-save-quote-/).first().click();
    await page.getByTestId("bc-create-offer").click();
    await page.getByTestId("bc-send-offer").click();
    await expect(page.getByTestId("bc-offer-builder")).toBeVisible();
  });

  test("04 — Buyer sees offer with expiry countdown", async ({ page }) => {
    const req = await newRequest();
    const bcRes = await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const bc = await bcRes.json();
    offerId = bc.activeOfferId;
    expect(offerId).toBeTruthy();

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/offers/${offerId}`);
    await expect(page.getByTestId("bc-offer-page")).toBeVisible();
    await expect(page.getByTestId("bc-offer-countdown")).toBeVisible();
    await expect(page.getByTestId("bc-offer-total")).not.toHaveText("$0");
    await expect(page.getByText(/SUP-/)).toHaveCount(0);
  });

  test("05 — Buyer requests revision", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/offers/${offerId}`);
    await page.getByTestId("bc-revision-message").fill("Please reduce wheat flour quantity to 8 MT.");
    await page.getByTestId("bc-request-revision").click();
    await expect(page.getByTestId("bc-revision-submitted")).toBeVisible({ timeout: 10000 });
  });

  test("06 — Operations resumes and buyer approves", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/bulk-container/procurement/${containerId}`);
    await page.getByTestId("bc-resume-procurement").click();
    await page.getByTestId(/bc-save-quote-/).first().click();
    await page.getByTestId("bc-create-offer").click();
    await page.getByTestId("bc-send-offer").click();

    const req = await newRequest();
    const bcRes = await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    offerId = (await bcRes.json()).activeOfferId;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/offers/${offerId}`);
    await page.getByTestId("bc-approve-offer").click();
    await expect(page.getByTestId("bc-offer-approved")).toBeVisible({ timeout: 10000 });
  });

  test("07 — API: supplier identity hidden from buyer offer", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/bulk-containers/offers/${offerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.lines.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(/SUP-/);
  });

  test("08 — Offer expiration", async ({ page }) => {
    const req = await newRequest();
    const authBuyer = { Authorization: `Bearer ${buyerToken}` };
    const authAdmin = { Authorization: `Bearer ${adminToken}` };

    const catalogRes = await req.get(`${API_BASE}/api/bulk-container/catalog/products?category=wheat-flour&limit=1`, {
      headers: authBuyer,
    });
    const product = (await catalogRes.json()).items[0];
    const packingTypeId =
      product.packingTypes.find((p: { code: string }) => p.code.startsWith("PT-BC-FLOUR"))?.id ??
      product.packingTypes[0].id;

    const createRes = await req.post(`${API_BASE}/api/bulk-containers`, {
      headers: authBuyer,
      data: { currency: "USD" },
    });
    expect(createRes.ok()).toBeTruthy();
    const expireWsId = (await createRes.json()).id;

    const lineRes = await req.post(`${API_BASE}/api/bulk-containers/${expireWsId}/lines`, {
      headers: authBuyer,
      data: {
        catalogProductId: product.id,
        packingTypeId,
        quantityMt: 8,
        specValues: {
          protein: 12,
          ash: 0.55,
          moisture: 14,
          wetGluten: 28,
          packing: "25 kg paper",
          origin: "Turkey",
        },
      },
    });
    expect(lineRes.ok()).toBeTruthy();

    await req.post(`${API_BASE}/api/bulk-containers/${expireWsId}/actions/submit`, { headers: authBuyer });
    await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${expireWsId}/actions/start-procurement`, {
      headers: authAdmin,
    });

    const proc = await (
      await req.get(`${API_BASE}/api/admin/bulk-container/procurement/${expireWsId}`, { headers: authAdmin })
    ).json();
    const lineId = proc.container.lines[0].id;

    await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${expireWsId}/quotes`, {
      headers: authAdmin,
      data: { lineId, supplierCode: "SUP-002", unitPrice: 360, currency: "USD" },
    });

    const offerData = await (
      await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${expireWsId}/offers`, {
        headers: authAdmin,
        data: { validityHours: 72 },
      })
    ).json();
    const expireOfferId = offerData.offers.find((o: { status: string }) => o.status === "DRAFT")!.id;

    await req.post(
      `${API_BASE}/api/admin/bulk-container/procurement/${expireWsId}/offers/${expireOfferId}/send`,
      { headers: authAdmin },
    );

    execSync(`npx prisma db execute --stdin`, {
      cwd: "/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend",
      input: `UPDATE bc_container_offers SET valid_until = NOW() - INTERVAL '2 hours' WHERE id = '${expireOfferId}';\n`,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const expireAction = await req.post(`${API_BASE}/api/admin/bulk-container/actions/expire-offers`, {
      headers: authAdmin,
    });
    expect((await expireAction.json()).expired).toBeGreaterThanOrEqual(1);

    const expiredRes = await req.get(`${API_BASE}/api/bulk-containers/${expireWsId}`, { headers: authBuyer });
    expect((await expiredRes.json()).state).toBe("BC_EXPIRED");

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/offers/${expireOfferId}`);
    await expect(page.getByTestId("bc-offer-expired")).toBeVisible();
  });

  test("09 — Control Tower bulk alerts", async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=BULK_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(alerts.ok()).toBeTruthy();
    const keys = ((await alerts.json()).items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys.some((k: string) => k.startsWith("bulk_"))).toBeTruthy();
  });
});
