// Sprint 18A — Trade Timeline Engine E2E
import { test, expect } from "@playwright/test";
import {
  uiLogin,
  USERS,
  apiLogin,
  newRequest,
  API_BASE,
  setupSubmittedRfqWithStrategy,
} from "./_helpers";

test.describe.serial("Trade Timeline Engine (18A)", () => {
  let rfqId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Timeline ${Date.now()}`);
    rfqId = created.id;
  });

  test("01 — API returns unified timeline with progress", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/trade-timeline/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tradeId).toBe(rfqId);
    expect(body.tradeRef).toMatch(/^TRADE-/);
    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.progressPercent).toBe("number");
    expect(body.currentStatus).toBeTruthy();
    expect(body.currentStatus.stage).toBeTruthy();
  });

  test("02 — Events are chronologically ordered", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const body = await req.get(`${API_BASE}/api/trade-timeline/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { events: Array<{ occurredAt: string }> };

    for (let i = 1; i < body.events.length; i++) {
      const prev = new Date(body.events[i - 1].occurredAt).getTime();
      const curr = new Date(body.events[i].occurredAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  test("03 — Progress reflects RFQ submitted milestone", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const body = await req.get(`${API_BASE}/api/trade-timeline/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as {
      progressPercent: number;
      events: Array<{ eventType: string }>;
    };

    const hasRfqSubmitted = body.events.some((e) => e.eventType === "RFQ_SUBMITTED");
    if (hasRfqSubmitted) {
      expect(body.progressPercent).toBeGreaterThanOrEqual(10);
    }
  });

  test("04 — Workspace renders timeline engine UI", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-timeline-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("trade-timeline-engine")).toBeVisible();
    await expect(page.getByTestId("trade-progress-bar")).toBeVisible();
    await expect(page.getByTestId("trade-current-milestone")).toBeVisible();
    await expect(page.getByTestId("trade-next-milestone")).toBeVisible();
  });

  test("05 — Dashboard timeline KPI endpoint", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/trade-timeline/kpi/summary`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.activeTrades).toBe("number");
    expect(typeof body.tradesInProduction).toBe("number");
    expect(typeof body.tradesInTransit).toBe("number");
    expect(typeof body.delayedTrades).toBe("number");
    expect(typeof body.completedTrades).toBe("number");
  });

  test("06 — Supplier ACL hides buyer-sensitive events", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supplier1);
    const res = await req.get(`${API_BASE}/api/trade-timeline/${rfqId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    if (res.status() === 403) {
      test.skip(true, "supplier not participant on this trade");
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { events: Array<{ eventType: string }> };
    expect(body.events.every((e) => e.eventType !== "ESTIMATED_CIF_AVAILABLE")).toBeTruthy();
  });
});
