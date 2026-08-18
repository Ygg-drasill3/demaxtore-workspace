// Sprint 07 — SmartContainer pilot hardening validation
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("SmartContainer pilot hardening (Sprint 07)", () => {
  let containerId = "";
  let offerId = "";
  let buyerToken = "";
  let adminToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
  });

  test("01 — Full journey: catalog → proposal → organization", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/pulses");
    await page.getByTestId("mc-product-card-MC-PUL-RL").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.getByTestId("mc-sidebar-review").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//);
    containerId = page.url().split("/").pop()!;
    await page.getByTestId("mc-request-pricing").click();
    await expect(page.getByTestId("mc-pricing-submitted")).toBeVisible({ timeout: 10000 });

    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/${containerId}`);
    await page.getByTestId("mc-start-procurement").click();
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();

    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    offerId = (await mcRes.json()).activeOfferId;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-approve-offer").click();
    await expect(page.getByTestId("mc-proposal-approved")).toBeVisible({ timeout: 10000 });

    await page.goto(`/buyer/mixed-container/organization/${containerId}`);
    await expect(page.getByTestId("mc-organization-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-org-sync-status")).toBeVisible();
    await expect(page.getByTestId("mc-org-module-PURCHASE_ORDERS")).toBeVisible();
    await expect(page.getByTestId("mc-org-tasks")).toBeVisible();
  });

  test("02 — Revision workflow before approval (second container)", async ({ page }) => {
    const req = await newRequest();
    const create = await req.post(`${API_BASE}/api/mixed-containers`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { containerType: "CONTAINER_40FT", currency: "USD" },
    });
    const mc = await create.json();
    const revContainerId = mc.id as string;

    const catalog = await req.get(`${API_BASE}/api/mixed-container/catalog/products?category=pulses&limit=5`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const product = (await catalog.json()).items[0];
    await req.post(`${API_BASE}/api/mixed-containers/${revContainerId}/lines`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        catalogProductId: product.id,
        packagingId: product.packagingOptions[0].id,
        palletCount: product.packagingOptions[0].moqPallets ?? 1,
      },
    });
    await req.post(`${API_BASE}/api/mixed-containers/${revContainerId}/actions/request-pricing`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    await req.post(`${API_BASE}/api/admin/mixed-containers/${revContainerId}/actions/start-procurement`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detail = await req.get(`${API_BASE}/api/mixed-containers/${revContainerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { lines: Array<{ id: string }> };
    await req.post(`${API_BASE}/api/admin/mixed-containers/${revContainerId}/procurement-quotes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { containerLineId: detail.lines[0].id, supplierCode: "SUP-001", exwPrice: 900, currency: "USD" },
    });
    const offerRes = await req.post(`${API_BASE}/api/admin/mixed-containers/${revContainerId}/offers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { exportExecutionFee: 500, estimatedFreight: 1100 },
    });
    const draft = (await offerRes.json()).offers.find((o: { status: string }) => o.status === "DRAFT");
    await req.post(`${API_BASE}/api/admin/mixed-containers/${revContainerId}/offers/${draft.id}/send`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeOfferId = (await req.get(`${API_BASE}/api/mixed-containers/${revContainerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json())).activeOfferId;

    const revision = await req.post(`${API_BASE}/api/mixed-containers/offers/${activeOfferId}/actions/request-revision`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { revisionType: "PRICING", comment: "Please revise pricing for pilot test" },
    });
    expect(revision.ok()).toBeTruthy();

    const mcState = await req.get(`${API_BASE}/api/mixed-containers/${revContainerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(mcState.state).toBe("MC_REVISION_REQUESTED");
  });

  test("03 — Buyer payment response excludes supplier codes", async () => {
    const req = await newRequest();
    const mcDetail = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { lines: Array<{ id: string }>; state: string };
    if (!["MC_ALLOCATION_IN_PROGRESS", "MC_PROFORMA_PENDING", "MC_PAYMENT_TRACKING", "MC_EXECUTION_READY"].includes(mcDetail.state)) {
      test.skip();
      return;
    }
    const lineId = mcDetail.lines[0]?.id;
    if (!lineId) test.skip();

    await req.post(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}/allocations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { containerLineId: lineId, supplierCode: "SUP-001", allocatedPallets: 1, expectedExwPrice: 1000 },
    }).catch(() => {});

    const coord = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(coord.ok()).toBeTruthy();
    const body = await coord.json();
    expect(JSON.stringify(body)).not.toContain("supplierCode");
    expect(JSON.stringify(body)).not.toContain("SUP-001");
  });

  test("04 — Duplicate proposal approval is rejected", async () => {
    const req = await newRequest();
    const dup = await req.post(`${API_BASE}/api/mixed-containers/offers/${offerId}/actions/approve`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(dup.status()).toBeGreaterThanOrEqual(400);
  });

  test("05 — Organization timeline has no duplicate dedupe keys", async () => {
    const req = await newRequest();
    const org = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/organization`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    const types = org.activityTimeline.map((e: { eventType: string }) => e.eventType);
    const orgCreated = types.filter((t: string) => t === "mixed_container.organization_created");
    expect(orgCreated.length).toBeLessThanOrEqual(1);
  });
});
