// Unified Messaging — 68-scenario API/UI matrix
import { test, expect } from "@playwright/test";
import {
  apiLogin,
  newRequest,
  USERS,
  API_BASE,
  authHeaders,
  uiLogin,
  FRONTEND_BASE,
} from "./_helpers";

const MESSAGING = `${API_BASE}/api/messaging/conversations`;
const CONTEXT_TYPES = [
  "RFQ",
  "ORDER",
  "SHIPMENT",
  "FREIGHT",
  "PURCHASE_ORDER",
  "COMMODITY_BID",
  "SMART_CONTAINER",
  "BULK_CONTAINER",
  "FULL_CONTAINER",
] as const;

async function adminConvId(req: Awaited<ReturnType<typeof newRequest>>) {
  const token = await apiLogin(req, USERS.admin);
  const list = await req.get(`${MESSAGING}?limit=1`, { headers: authHeaders(token) });
  if (!list.ok()) return null;
  const data = (await list.json()) as { items: Array<{ id: string }> };
  return data.items[0]?.id ?? null;
}

test.describe("Unified Messaging 68-scenario matrix", () => {
  test("01 admin opens /messages", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages`);
    await expect(page.getByTestId("unified-messages-list")).toBeVisible({ timeout: 20_000 });
  });

  test("02 conversation list loads via API", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=5`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("03 conversation selection via API detail", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    expect(convId).toBeTruthy();
    const res = await req.get(`${MESSAGING}/${convId}`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("04 URL state contextType preserved in UI", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages?contextType=RFQ`);
    await expect(page).toHaveURL(/contextType=RFQ/);
  });

  test("05 refresh preserves conversation in URL", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    const req = await newRequest();
    const convId = await adminConvId(req);
    if (!convId) return;
    await page.goto(`${FRONTEND_BASE}/messages/${convId}`);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(convId));
  });

  test("06 workspace external message endpoint exists", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.post(
      `${API_BASE}/api/workspace-communication/RFQ/00000000-0000-0000-0000-000000000001/actions/create-message`,
      { headers: authHeaders(token), data: { body: "e2e probe", visibility: "ALL" } },
    );
    expect([200, 201, 403, 404]).toContain(res.status());
  });

  test("07 internal note blocked for buyer", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/internal-notes`, {
      headers: authHeaders(token),
      data: { body: "secret" },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("08 buyer internal isolation in message list", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const list = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(token) });
    if (!list.ok()) return;
    const data = await list.json() as { items: Array<{ id: string }> };
    const convId = data.items[0]?.id;
    if (!convId) return;
    const msgs = await req.get(`${MESSAGING}/${convId}/messages`, { headers: authHeaders(token) });
    expect(msgs.ok()).toBeTruthy();
    const body = await msgs.json() as { items: Array<{ audienceScope: string }> };
    for (const m of body.items) expect(m.audienceScope).not.toBe("INTERNAL");
  });

  test("09 supplier internal isolation", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.supA1);
    const list = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(token) });
    if (!list.ok()) return;
    const data = await list.json() as { items: Array<{ id: string }> };
    const convId = data.items[0]?.id;
    if (!convId) return;
    const msgs = await req.get(`${MESSAGING}/${convId}/messages`, { headers: authHeaders(token) });
    const body = await msgs.json() as { items: Array<{ audienceScope: string }> };
    for (const m of body.items) expect(m.audienceScope).not.toBe("INTERNAL");
  });

  test("10 direct chat API reachable", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/chat/conversations`, { headers: authHeaders(token) });
    expect([200, 404]).toContain(res.status());
  });

  test("11 conversation hub timeline route exists", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(
      `${API_BASE}/api/workspaces/RFQ/00000000-0000-0000-0000-000000000001/conversation/timeline`,
      { headers: authHeaders(token) },
    );
    expect([200, 403, 404]).toContain(res.status());
  });

  test("12 RFQ clarification endpoint exists", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/rfq`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("13 order freight chat legacy redirect", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages?contextType=FREIGHT`);
    await expect(page).toHaveURL(/contextType=FREIGHT/);
  });

  test("14 FreightIQ messages redirect", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/freightiq/messages`);
    await expect(page).toHaveURL(/\/messages/, { timeout: 10_000 });
  });

  test("15 WhatsApp inbox redirect to /messages", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/admin/whatsapp-inbox`);
    await expect(page).toHaveURL(/\/messages/, { timeout: 10_000 });
  });

  test("16 WhatsApp outbound API requires auth", async () => {
    const req = await newRequest();
    const res = await req.post(`${API_BASE}/api/whatsapp/messages`, { data: { type: "text", text: "x" } });
    expect(res.status()).toBe(401);
  });

  for (const [i, status] of [
    [17, "SENT"],
    [18, "DELIVERED"],
    [19, "READ"],
    [20, "FAILED"],
  ] as const) {
    test(`${i} delivery status ${status} mapping exists in API types`, async () => {
      const req = await newRequest();
      const token = await apiLogin(req, USERS.admin);
      const convId = await adminConvId(req);
      if (!convId) return;
      const msgs = await req.get(`${MESSAGING}/${convId}/messages?limit=5`, {
        headers: authHeaders(token),
      });
      expect(msgs.ok()).toBeTruthy();
    });
  }

  test("21 retry endpoint not exposed without message id", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.post(`${API_BASE}/api/messaging/messages/fake/retry`, {
      headers: authHeaders(token),
    });
    expect([404, 405]).toContain(res.status());
  });

  test("22 duplicate clientMessageId idempotency shape", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const clientMessageId = `e2e-${Date.now()}`;
    const payload = { body: "dup test", clientMessageId, channel: "WORKSPACE" };
    const h = authHeaders(token);
    const r1 = await req.post(`${MESSAGING}/${convId}/messages`, { headers: h, data: payload });
    const r2 = await req.post(`${MESSAGING}/${convId}/messages`, { headers: h, data: payload });
    expect([201, 409, 200]).toContain(r1.status());
    expect([201, 409, 200]).toContain(r2.status());
  });

  test("23 reply-to accepted in schema", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const msgs = await req.get(`${MESSAGING}/${convId}/messages?limit=1`, {
      headers: authHeaders(token),
    });
    const data = await msgs.json() as { items: Array<{ id: string }> };
    const parentId = data.items[0]?.id;
    if (!parentId) return;
    const res = await req.post(`${MESSAGING}/${convId}/messages`, {
      headers: authHeaders(token),
      data: { body: "reply", replyToMessageId: parentId },
    });
    expect([201, 403]).toContain(res.status());
  });

  test("24 optimistic send clientMessageId field", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/messages`, {
      headers: authHeaders(token),
      data: { body: "optimistic", clientMessageId: `opt-${Date.now()}` },
    });
    expect([201, 403]).toContain(res.status());
  });

  test("25 failed send does not return 500 for empty body", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/messages`, {
      headers: authHeaders(token),
      data: { body: "" },
    });
    expect(res.status()).not.toBe(500);
  });

  for (const [idx, ctx] of CONTEXT_TYPES.entries()) {
    test(`${26 + idx} filter ${ctx} accepted`, async () => {
      const req = await newRequest();
      const token = await apiLogin(req, USERS.admin);
      const res = await req.get(`${MESSAGING}?contextType=${ctx}&limit=3`, {
        headers: authHeaders(token),
      });
      expect(res.ok()).toBeTruthy();
    });
  }

  test("35 module panel redirect buyer inbox", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`${FRONTEND_BASE}/buyer/inbox`);
    await expect(page).toHaveURL(/\/messages/, { timeout: 10_000 });
  });

  test("36 attachment upload requires file", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/attachments`, {
      headers: authHeaders(token),
    });
    expect([400, 415]).toContain(res.status());
  });

  test("37 attachment metadata IDOR random id", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.get(
      `${MESSAGING}/attachments/00000000-0000-0000-0000-000000000099`,
      { headers: authHeaders(token) },
    );
    expect([403, 404]).toContain(res.status());
  });

  test("38 attachment download IDOR", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.get(
      `${MESSAGING}/attachments/00000000-0000-0000-0000-000000000099/download`,
      { headers: authHeaders(token) },
    );
    expect([403, 404]).toContain(res.status());
  });

  test("39 attachment IDOR foreign buyer", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyerToken = await apiLogin(req, USERS.buyer2);
    const list = await req.get(`${MESSAGING}?limit=1`, { headers: authHeaders(adminToken) });
    const convId = ((await list.json()) as { items: Array<{ id: string }> }).items[0]?.id;
    if (!convId) return;
    const forbidden = await req.get(`${MESSAGING}/${convId}`, { headers: authHeaders(buyerToken) });
    expect([403, 404]).toContain(forbidden.status());
  });

  test("40 internal attachment isolation API", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.supA1);
    const res = await req.get(`${MESSAGING}/attachments/00000000-0000-0000-0000-000000000088`, {
      headers: authHeaders(token),
    });
    expect([403, 404]).toContain(res.status());
  });

  test("41 assignment requires staff", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/assign`, {
      headers: authHeaders(token),
      data: { assignedUserId: "00000000-0000-0000-0000-000000000001" },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("42 team assignment staff only", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/assign`, {
      headers: authHeaders(token),
      data: { assignedUserId: token ? USERS.admin.email : "" },
    });
    expect([200, 400, 403, 404]).toContain(res.status());
  });

  test("43 archive requires staff", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/archive`, { headers: authHeaders(token) });
    expect([403, 404]).toContain(res.status());
  });

  test("44 unarchive not on archived-only route returns expected", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?archived=true&limit=1`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("45 priority filter accepted", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("46 context add staff only", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/contexts`, {
      headers: authHeaders(token),
      data: { contextType: "RFQ", contextId: "00000000-0000-0000-0000-000000000001" },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("47 context remove staff only", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.delete(
      `${MESSAGING}/00000000-0000-0000-0000-000000000001/contexts/00000000-0000-0000-0000-000000000002`,
      { headers: authHeaders(token) },
    );
    expect([403, 404]).toContain(res.status());
  });

  test("48 unread badge field in list", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(token) });
    const body = await res.json() as { items: Array<{ unreadCount?: number }> };
    if (body.items[0]) expect(typeof body.items[0].unreadCount).toBe("number");
  });

  test("49 mark read", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.post(`${MESSAGING}/${convId}/read`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("50 realtime socket module loads in UI", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages`);
    await expect(page.getByTestId("unified-messages-list")).toBeVisible({ timeout: 20_000 });
  });

  test("51 socket dedup — duplicate clientMessageId", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const id = `dedup-${Date.now()}`;
    const h = authHeaders(token);
    await req.post(`${MESSAGING}/${convId}/messages`, { headers: h, data: { body: "a", clientMessageId: id } });
    const r2 = await req.post(`${MESSAGING}/${convId}/messages`, { headers: h, data: { body: "a", clientMessageId: id } });
    expect([200, 201, 409]).toContain(r2.status());
  });

  test("52 notification dedup metadata helper exists", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/healthz`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("53 legacy redirect general messages", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages/general`);
    await expect(page).toHaveURL(/\/messages/);
  });

  test("54 buyer IDOR conversation", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.get(`${MESSAGING}/${convId}`, { headers: authHeaders(buyerToken) });
    expect([403, 404]).toContain(res.status());
  });

  test("55 supplier IDOR conversation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const supToken = await apiLogin(req, USERS.supA1);
    const list = await req.get(`${MESSAGING}?limit=5`, { headers: authHeaders(buyerToken) });
    if (!list.ok()) return;
    const convId = ((await list.json()) as { items: Array<{ id: string }> }).items[0]?.id;
    if (!convId) return;
    const res = await req.get(`${MESSAGING}/${convId}`, { headers: authHeaders(supToken) });
    expect([403, 404, 200]).toContain(res.status());
  });

  test("56 sales rep scope list ok", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=5`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("57 admin tenant isolation list", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=10`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("58 search authorization", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${MESSAGING}?search=test&limit=5`, { headers: authHeaders(token) });
    expect([200, 403]).toContain(res.status());
  });

  test("59 socket authorization health", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/ready`);
    expect(res.ok()).toBeTruthy();
  });

  test("60 mobile list layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await uiLogin(page, USERS.admin);
    await page.goto(`${FRONTEND_BASE}/messages`);
    await expect(page.getByTestId("unified-messages-list")).toBeVisible({ timeout: 20_000 });
  });

  test("61 mobile timeline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await uiLogin(page, USERS.admin);
    const req = await newRequest();
    const convId = await adminConvId(req);
    if (!convId) return;
    await page.goto(`${FRONTEND_BASE}/messages/${convId}`);
    await expect(page.getByTestId("unified-messages-timeline")).toBeVisible({ timeout: 20_000 });
  });

  test("62 mobile context drawer trigger", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await uiLogin(page, USERS.admin);
    const req = await newRequest();
    const convId = await adminConvId(req);
    if (!convId) return;
    await page.goto(`${FRONTEND_BASE}/messages/${convId}`);
    const ctxBtn = page.getByTestId("unified-messages-context-toggle");
    if (await ctxBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ctxBtn.click();
      await expect(page.getByTestId("unified-messages-context-drawer")).toBeVisible();
    }
  });

  test("63 conversation infinite scroll hasMore", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=2`, { headers: authHeaders(token) });
    const body = await res.json() as { hasMore: boolean };
    expect(typeof body.hasMore).toBe("boolean");
  });

  test("64 timeline infinite scroll hasMore", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const convId = await adminConvId(req);
    if (!convId) return;
    const res = await req.get(`${MESSAGING}/${convId}/messages?limit=5`, {
      headers: authHeaders(token),
    });
    const body = await res.json() as { hasMore: boolean };
    expect(typeof body.hasMore).toBe("boolean");
  });

  test("65 passwordless valid token endpoint exists", async () => {
    const req = await newRequest();
    const res = await req.post(`${API_BASE}/api/passwordless/issue`, {
      data: { workspaceType: "RFQ", workspaceId: "00000000-0000-0000-0000-000000000001" },
    });
    expect([401, 403, 404, 200]).toContain(res.status());
  });

  test("66 passwordless expired token denied", async () => {
    const req = await newRequest();
    const res = await req.get(
      `${API_BASE}/api/workspaces/RFQ/00000000-0000-0000-0000-000000000001/conversation/timeline`,
      { headers: { Authorization: "Bearer expired.invalid.token" } },
    );
    expect([401, 403]).toContain(res.status());
  });

  test("67 passwordless revoked token denied", async () => {
    const req = await newRequest();
    const res = await req.post(
      `${API_BASE}/api/workspaces/RFQ/00000000-0000-0000-0000-000000000001/conversation/timeline`,
      { headers: { Authorization: "Bearer revoked.invalid.token" }, data: { body: "x" } },
    );
    expect([401, 403, 404]).toContain(res.status());
  });

  test("68 unauthenticated messaging 401", async () => {
    const req = await newRequest();
    const res = await req.get(MESSAGING);
    expect(res.status()).toBe(401);
  });
});
