// Unified Messaging — API security and IDOR regression
import { test, expect } from "@playwright/test";
import { apiLogin, newRequest, USERS, API_BASE } from "./_helpers";

test.describe("Unified Messaging API security", () => {
  test("buyer cannot access another conversation by ID", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyerToken = await apiLogin(req, USERS.buyer1);

    const list = await req.get(`${API_BASE}/api/messaging/conversations?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(list.ok()).toBeTruthy();
    const data = (await list.json()) as { items: Array<{ id: string }> };
    const targetId = data.items[0]?.id;
    if (!targetId) return;

    const forbidden = await req.get(`${API_BASE}/api/messaging/conversations/${targetId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect([403, 404]).toContain(forbidden.status());
  });

  test("supplier cannot list admin-only internal messages via unified API", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const list = await req.get(`${API_BASE}/api/messaging/conversations?limit=3`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    if (!list.ok()) return;
    const data = (await list.json()) as { items: Array<{ id: string }> };
    const convId = data.items[0]?.id;
    if (!convId) return;

    const msgs = await req.get(`${API_BASE}/api/messaging/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(msgs.ok()).toBeTruthy();
    const body = (await msgs.json()) as { items: Array<{ audienceScope: string }> };
    for (const m of body.items) {
      expect(m.audienceScope).not.toBe("INTERNAL");
    }
  });

  test("unauthenticated messaging API returns 401", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/messaging/conversations`);
    expect(res.status()).toBe(401);
  });
});
