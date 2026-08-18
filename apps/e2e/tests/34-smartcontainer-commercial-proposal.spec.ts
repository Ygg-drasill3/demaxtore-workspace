// Sprint 04 — SmartContainer Commercial Proposal Management E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("SmartContainer commercial proposal (Sprint 04)", () => {
  let containerId = "";
  let offerId = "";
  let proposalRef = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    await apiLogin(req, USERS.admin);
  });

  test("01 — Procurement team publishes commercial proposal with CP reference", async ({ page }) => {
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
    await page.getByTestId(/mc-brand-/).first().fill("Doğa");
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-offer-logistics-cost").fill("1700");
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();

    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const mc = await mcRes.json();
    offerId = mc.activeOfferId;
    expect(offerId).toBeTruthy();

    const proposalRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/commercial-proposal`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(proposalRes.ok()).toBeTruthy();
    const proposal = await proposalRes.json();
    proposalRef = proposal.proposalRef;
    expect(proposalRef).toMatch(/^CP-\d{4}-\d{6}$/);
    expect(proposal.version).toBe(1);
    expect(proposal.logisticsCost).toBe(1700);
    expect(proposal.lines[0].brand).toBe("Doğa");
  });

  test("02 — Buyer reviews proposal inside procurement request", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/requests/${containerId}`);
    await expect(page.getByTestId("mc-commercial-proposal")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-proposal-ref")).toContainText(proposalRef);
    await expect(page.getByTestId("mc-offer-logistics")).toBeVisible();
    await expect(page.getByText(/SUP-/)).toHaveCount(0);
  });

  test("03 — Buyer requests revision with notes", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-revision-comment").fill("Please remove Olive Oil.");
    await page.getByTestId("mc-request-revision").click();
    await expect(page.getByTestId("mc-revision-submitted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-buyer-notes")).toBeVisible();
  });

  test("04 — Revised proposal version and approval starts organization", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/${containerId}`);
    await page.getByTestId("mc-resume-procurement").click();
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();

    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    offerId = (await mcRes.json()).activeOfferId;

    const proposalRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/commercial-proposal`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const proposal = await proposalRes.json();
    expect(proposal.version).toBe(2);
    expect(proposal.proposalRef).toBe(proposalRef);
    expect(proposal.versions.length).toBeGreaterThanOrEqual(2);

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-approve-offer").click();
    await expect(page.getByTestId("mc-proposal-approved")).toBeVisible({ timeout: 10000 });

    const wsRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const ws = await wsRes.json();
    expect(ws.state).toBe("MC_EXECUTION_READY");
    expect(ws.procurementStatus).toBe("ORGANIZATION_STARTED");
  });
});
