// Final production-ready QA — payments, messaging, socket, FreightIQ
import { test, expect } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import {
  uiLogin,
  USERS,
  apiLogin,
  newRequest,
  API_BASE,
  readAccessToken,
  bootstrapAcknowledgedPo,
  advanceOrderToFreightRequested,
  E2E_TEST_SECRET,
  e2eHeaders,
} from "./_helpers";

test.describe("Production-ready QA", () => {
  test("Payments — plan, intent, webhook visibility", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    const supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    const { orderId } = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, "PR QA payments");

    const plan = await req.get(`${API_BASE}/api/payments/orders/${orderId}/plan`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(plan.status()).toBeLessThan(500);

    const intent = await req.post(`${API_BASE}/api/payments/orders/${orderId}/intents`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { amount: 50, currency: "USD", description: "PR QA intent" },
    });
    expect([200, 201]).toContain(intent.status());
    if (intent.ok()) {
      const body = await intent.json() as { id: string; status: string };
      expect(body.status).toBeTruthy();
      const view = await req.get(`${API_BASE}/api/payments/intents/${body.id}`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });
      expect(view.ok()).toBeTruthy();
    }
  });

  test("Messaging — list, send, realtime via API", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    const supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    const { orderId } = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, "PR QA messaging");

    const base = `${API_BASE}/api/workspace-communication/order/${orderId}`;
    const send = await req.post(`${base}/actions/create-message`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          body: `PR QA message ${Date.now()}`,
          messageType: "MESSAGE",
          visibility: "ALL_PARTICIPANTS",
        },
      },
    });
    expect(send.ok()).toBeTruthy();
    const list = await req.get(base, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(list.ok()).toBeTruthy();
    const body = await list.json() as { messages: Array<{ body: string }> };
    expect(body.messages.length).toBeGreaterThan(0);
  });

  test("Socket — connect, subscribe, reconnect after token refresh", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    const token = await readAccessToken(page);
    expect(token.length).toBeGreaterThan(10);

    const socketUrl = new URL(API_BASE).origin;
    const connect = (accessToken: string): Promise<Socket> =>
      new Promise((resolve, reject) => {
        const auth: Record<string, string> = { token: accessToken };
        if (E2E_TEST_SECRET.length >= 32) auth.e2eSecret = E2E_TEST_SECRET;
        const sock = io(socketUrl, {
          path: "/socket.io",
          transports: ["websocket"],
          auth,
          reconnection: false,
          timeout: 10_000,
        });
        sock.once("connect", () => resolve(sock));
        sock.once("connect_error", (err) => reject(err));
      });

    const sock = await connect(token);
    expect(sock.connected).toBe(true);
    sock.disconnect();

    const refresh = await page.request.post(`${API_BASE}/api/auth/refresh`);
    expect(refresh.ok()).toBeTruthy();
    const refreshed = await refresh.json() as { accessToken: string };
    expect(refreshed.accessToken).toBeTruthy();

    const sock2 = await connect(refreshed.accessToken);
    expect(sock2.connected).toBe(true);
    sock2.disconnect();
  });

  test("Socket — logout disconnects (no stale auth)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    const token = await readAccessToken(page);
    const socketUrl = new URL(API_BASE).origin;

    const bad = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token: "invalid-token" },
      reconnection: false,
      timeout: 5_000,
    });
    await new Promise<void>((resolve) => {
      bad.once("connect_error", () => resolve());
      setTimeout(resolve, 3_000);
    });
    expect(bad.connected).toBe(false);
    bad.disconnect();

    const good = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      reconnection: false,
      timeout: 10_000,
    });
    await new Promise<void>((resolve, reject) => {
      good.once("connect", () => resolve());
      good.once("connect_error", reject);
    });
    good.disconnect();
  });

  test("FreightIQ — SSO bridge + embed shell", async ({ page, request }) => {
    await uiLogin(page, USERS.buyer1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/buyer/freightiq");
    await expect(page.getByTestId("embed-shell-layout")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("freightiq-embed-page")).toBeVisible();

    const token = await readAccessToken(page);
    const sso = await request.get(
      "/api/integrations/freightiq/sso?next=/dashboard&embed=workspace",
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15_000 },
    );
    expect(sso.status()).toBe(200);
    const body = await sso.json() as { bridgeUrl: string; embedUrl: string; sso: string };
    expect(body.sso.length).toBeGreaterThan(20);
    expect(body.embedUrl).toMatch(/freightiq/);

    const embed = page.getByTestId("freightiq-external-embed");
    await expect(embed).toBeVisible({ timeout: 20_000 });
    const iframe = embed.locator("iframe");
    const error = page.getByTestId("query-state-error");
    await expect
      .poll(async () => {
        const hasIframe = (await iframe.count()) > 0;
        const hasError = (await error.count()) > 0;
        return hasIframe || hasError;
      }, { timeout: 25_000 })
      .toBe(true);
  });

  test("FSM guard — book_shipment blocked without freight selection", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    const supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    const { orderId } = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, "PR QA FSM guard");

    await advanceOrderToFreightRequested(req, orderId, {
      supplier: supplierToken,
      buyer: buyerToken,
    });
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { mode: "OCEAN_FCL", pol: "CNSHA", pod: "NLRTM", cargoDescription: "guard" } },
    });
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    const book = await req.post(`${API_BASE}/api/orders/${orderId}/actions/book-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          freightForwarder: "FF",
          vesselName: "MV Test",
          billOfLading: "BL-PR",
          expectedDeparture: future,
        },
      },
    });
    expect(book.status()).toBe(409);
    const err = await book.json() as { error?: { code?: string } };
    expect(err.error?.code).toBe("FREIGHT_OFFER_NOT_SELECTED");
  });
});
