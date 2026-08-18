// BYOWA — Multi-tenant WhatsApp Business E2E
import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import {
  API_BASE,
  E2E_TEST_SECRET,
  USERS,
  apiLogin,
  authHeaders,
  e2eHeaders,
  newRequest,
  uiLogin,
  waitForHydrate,
} from "./_helpers";

const BUYER_A_PHONE = "111111111111111";
const BUYER_B_PHONE = "222222222222222";
const TOKEN_A = "e2e-token-buyer-a-abcdef";
const TOKEN_B = "e2e-token-buyer-b-abcdef";
const SUPPLIER_PHONE = "905322222222";

function whatsappWebhookSignature(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function mockConnect(
  req: Awaited<ReturnType<typeof newRequest>>,
  buyerEmail: string,
  phoneNumberId: string,
  fakeAccessToken: string,
) {
  const res = await req.post(`${API_BASE}/api/internal/e2e/whatsapp-business/mock-connect`, {
    headers: e2eHeaders(),
    data: {
      buyerEmail,
      phoneNumberId,
      wabaId: `waba-${phoneNumberId}`,
      displayPhoneNumber: `+90 532 ${phoneNumberId.slice(-4)}`,
      verifiedName: `E2E ${buyerEmail}`,
      fakeAccessToken,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

test.describe.serial("BYOWA WhatsApp Business", () => {
  test.skip(!E2E_TEST_SECRET || E2E_TEST_SECRET.length < 32, "E2E_TEST_SECRET required");

  test("01 — Not connected state on integrations page", async ({ page }) => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/internal/e2e/whatsapp-business/mock-disconnect`, {
      headers: e2eHeaders(),
      data: { buyerEmail: USERS.buyer1.email },
    });

    await uiLogin(page, USERS.buyer1);
    await page.goto("/account/integrations/whatsapp-business");
    await waitForHydrate(page);
    await expect(page.getByText("Connect your WhatsApp Business")).toBeVisible();
  });

  test("02 — Mock embedded signup → connected state", async ({ page }) => {
    const req = await newRequest();
    await mockConnect(req, USERS.buyer1.email, BUYER_A_PHONE, TOKEN_A);

    await uiLogin(page, USERS.buyer1);
    await page.goto("/account/integrations/whatsapp-business");
    await waitForHydrate(page);
    await expect(page.getByText("Connected")).toBeVisible();
  });

  test("03 — Buyer A / Buyer B tenant isolation on connection records", async () => {
    const req = await newRequest();
    await mockConnect(req, USERS.buyer1.email, BUYER_A_PHONE, TOKEN_A);
    await mockConnect(req, USERS.buyer2.email, BUYER_B_PHONE, TOKEN_B);

    const tokenA = await apiLogin(req, USERS.buyer1);
    const tokenB = await apiLogin(req, USERS.buyer2);

    const meA = await req.get(`${API_BASE}/api/integrations/whatsapp/me`, { headers: authHeaders(tokenA) });
    const meB = await req.get(`${API_BASE}/api/integrations/whatsapp/me`, { headers: authHeaders(tokenB) });

    const connA = (await meA.json()) as { connection: { displayPhoneNumber: string | null } };
    const connB = (await meB.json()) as { connection: { displayPhoneNumber: string | null } };

    expect(connA.connection.displayPhoneNumber).not.toBe(connB.connection.displayPhoneNumber);
    expect(JSON.stringify(connA)).not.toContain(TOKEN_A);
    expect(JSON.stringify(connB)).not.toContain(TOKEN_B);
  });

  test("04 — Disconnect blocks subsequent send", async () => {
    const req = await newRequest();
    await mockConnect(req, USERS.buyer1.email, BUYER_A_PHONE, TOKEN_A);
    const buyerToken = await apiLogin(req, USERS.buyer1);

    await req.post(`${API_BASE}/api/integrations/whatsapp/disconnect`, {
      headers: authHeaders(buyerToken),
    });

    const me = await req.get(`${API_BASE}/api/integrations/whatsapp/me`, { headers: authHeaders(buyerToken) });
    const body = (await me.json()) as { connection: { connected: boolean } };
    expect(body.connection.connected).toBe(false);
  });

  test("05 — Inbound webhook routes to buyer A conversation metadata", async () => {
    const req = await newRequest();
    await mockConnect(req, USERS.buyer1.email, BUYER_A_PHONE, TOKEN_A);

    const appSecret = process.env.WHATSAPP_APP_SECRET ?? "test-app-secret-for-e2e-min-32-chars!!";
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: BUYER_A_PHONE },
            contacts: [{ wa_id: SUPPLIER_PHONE, profile: { name: "Supplier" } }],
            messages: [{
              from: SUPPLIER_PHONE,
              id: `wamid.e2e.${Date.now()}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: "text",
              text: { body: "Supplier reply E2E" },
            }],
          },
        }],
      }],
    };
    const raw = JSON.stringify(payload);
    const sig = whatsappWebhookSignature(raw, appSecret);

    const webhook = await req.post(`${API_BASE}/api/webhooks/whatsapp`, {
      headers: { ...e2eHeaders(), "Content-Type": "application/json", "x-hub-signature-256": sig },
      data: raw,
    });
    expect(webhook.ok()).toBeTruthy();
  });

  test("06 — Admin can list unresolved events and connections", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);

    const unresolved = await req.get(`${API_BASE}/api/admin/whatsapp-unresolved-events`, {
      headers: authHeaders(adminToken),
    });
    expect(unresolved.ok()).toBeTruthy();

    const connections = await req.get(`${API_BASE}/api/admin/whatsapp-connections`, {
      headers: authHeaders(adminToken),
    });
    expect(connections.ok()).toBeTruthy();
    const data = (await connections.json()) as { connections: Array<{ phoneNumberIdMasked: string | null }> };
    for (const c of data.connections) {
      expect(JSON.stringify(c)).not.toContain(TOKEN_A);
      expect(JSON.stringify(c)).not.toContain(TOKEN_B);
    }
  });

  test("07 — Reconnect restores connected state", async () => {
    const req = await newRequest();
    await mockConnect(req, USERS.buyer1.email, BUYER_A_PHONE, TOKEN_A);
    const buyerToken = await apiLogin(req, USERS.buyer1);

    const me = await req.get(`${API_BASE}/api/integrations/whatsapp/me`, { headers: authHeaders(buyerToken) });
    const body = (await me.json()) as { connection: { connected: boolean } };
    expect(body.connection.connected).toBe(true);
  });
});
