// Sprint 17B — FreightIQ Booking Engine E2E

import { test, expect } from "@playwright/test";
import {
  apiLogin,
  bootstrapAcknowledgedPo,
  newRequest,
  uiLogin,
  USERS,
  API_BASE,
} from "./_helpers";

function forecastDates(cargoReadyOffsetDays = 45) {
  const now = Date.now();
  const start = new Date(now + 7 * 86_400_000).toISOString();
  const finish = new Date(now + 35 * 86_400_000).toISOString();
  const cargoReady = new Date(now + cargoReadyOffsetDays * 86_400_000).toISOString();
  return { productionStartDate: start, estimatedProductionFinishDate: finish, estimatedCargoReadyDate: cargoReady };
}

test.describe.serial("FreightIQ Booking Engine (Sprint 17B)", () => {
  let rfqId = "";
  let bookingId = "";
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";
  let recommendedOptionId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    const boot = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, `E2E Booking ${Date.now()}`);
    rfqId = boot.rfqId;
  });

  test("01 — Supplier submits cargo ready forecast", async () => {
    test.skip(!rfqId, "setup incomplete");
    const req = await newRequest();
    const dates = forecastDates();
    const res = await req.post(`${API_BASE}/api/freight-bookings`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { tradeId: rfqId, ...dates, confidenceLevel: "HIGH", notes: "E2E forecast" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { status: string; estimatedCargoReadyDate: string };
    expect(body.status).toBe("ACTIVE");
    expect(body.estimatedCargoReadyDate).toBeTruthy();
  });

  test("02 — Admin creates booking plan with carrier options and scores", async () => {
    test.skip(!rfqId, "setup incomplete");
    const req = await newRequest();
    const res = await req.post(`${API_BASE}/api/freight-bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { tradeId: rfqId, createPlan: true },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      booking: { id: string; status: string };
      carrierOptions: Array<{ id: string; recommendationScore: number; status: string }>;
      recommendedOption: { id: string; recommendationScore: number };
    };
    bookingId = body.booking.id;
    expect(body.booking.status).toBe("UNDER_REVIEW");
    expect(body.carrierOptions.length).toBeGreaterThanOrEqual(3);
    const scores = body.carrierOptions.map((o) => o.recommendationScore);
    expect(Math.max(...scores)).toBeLessThanOrEqual(100);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(0);
    const recommended = body.carrierOptions.find((o) => o.status === "RECOMMENDED");
    expect(recommended).toBeTruthy();
    recommendedOptionId = body.recommendedOption.id;
  });

  test("03 — Carrier comparison panel API", async () => {
    test.skip(!rfqId || !bookingId, "setup incomplete");
    const req = await newRequest();
    const panel = await req.get(`${API_BASE}/api/freight-bookings/panel?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as {
      forecast: { estimatedCargoReadyDate: string } | null;
      carrierOptions: Array<{ transitDays: number; freightAmount: number; cutoffDate: string }>;
      recommendedOption: { recommendationScore: number } | null;
      bestOverallLabel: string | null;
    };
    expect(panel.forecast).toBeTruthy();
    expect(panel.carrierOptions.length).toBeGreaterThan(0);
    expect(panel.recommendedOption).toBeTruthy();
    expect(panel.bestOverallLabel).toBe("Best Overall Option");
    expect(panel.carrierOptions[0].transitDays).toBeGreaterThan(0);
    expect(panel.carrierOptions[0].freightAmount).toBeGreaterThan(0);
  });

  test("04 — Buyer selects recommended carrier", async () => {
    test.skip(!bookingId || !recommendedOptionId, "setup incomplete");
    const req = await newRequest();
    const select = await req.post(`${API_BASE}/api/freight-bookings/${bookingId}/select`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { carrierOptionId: recommendedOptionId },
    });
    expect(select.ok()).toBeTruthy();
    const body = await select.json() as { status: string; selectedCarrierOptionId: string };
    expect(body.status).toBe("APPROVED");
    expect(body.selectedCarrierOptionId).toBe(recommendedOptionId);
  });

  test("05 — Admin confirms booking", async () => {
    test.skip(!bookingId, "setup incomplete");
    const req = await newRequest();
    const confirm = await req.post(`${API_BASE}/api/freight-bookings/${bookingId}/confirm`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(confirm.ok()).toBeTruthy();
    const body = await confirm.json() as { status: string; confirmedAt: string | null };
    expect(body.status).toBe("BOOKED");
    expect(body.confirmedAt).toBeTruthy();
  });

  test("06 — Rebooking flow after forecast revision", async () => {
    test.skip(!rfqId || !bookingId, "setup incomplete");
    const req = await newRequest();
    const dates = forecastDates(60);
    await req.post(`${API_BASE}/api/freight-bookings`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { tradeId: rfqId, ...dates, confidenceLevel: "MEDIUM", notes: "Revised forecast" },
    });

    const list = await req.get(`${API_BASE}/api/freight-bookings?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as Array<{ id: string; status: string }>;

    const rebookRequired = list.find((b) => b.status === "REBOOK_REQUIRED");
    expect(rebookRequired).toBeTruthy();

    const plan = await req.post(`${API_BASE}/api/freight-bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { tradeId: rfqId, createPlan: true },
    });
    expect(plan.ok()).toBeTruthy();
    const newBooking = await plan.json() as { booking: { id: string; status: string } };
    expect(newBooking.booking.status).toBe("UNDER_REVIEW");
    bookingId = newBooking.booking.id;
  });

  test("07 — Buyer UI: FreightIQ Booking panel", async ({ page }) => {
    test.skip(!rfqId, "setup incomplete");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("freight-booking-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("cargo-forecast-card")).toBeVisible();
    await expect(page.getByTestId("carrier-comparison-table")).toBeVisible();
    await expect(page.getByTestId("booking-recommendation-card")).toBeVisible();
  });

  test("08 — Trade workspace shows FreightIQ Booking section", async ({ page }) => {
    test.skip(!rfqId, "setup incomplete");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-freight-booking-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("trade-booking-status")).toBeVisible();
  });

  test("09 — Dashboard booking KPIs", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-kpi-bookings-pending")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("cc-kpi-bookings-confirmed")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-cutoff-risks")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-forecast-changes")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-rebook-required")).toBeVisible();
  });

  test("10 — Supplier ACL: status only, no freight scores in list", async () => {
    test.skip(!rfqId, "setup incomplete");
    const req = await newRequest();
    const panel = await req.get(`${API_BASE}/api/freight-bookings/panel?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as Record<string, unknown>;
    expect(panel.forecast).toBeTruthy();
    expect(panel.carrierOptions).toBeUndefined();
    expect(panel.recommendedOption).toBeUndefined();
  });
});
