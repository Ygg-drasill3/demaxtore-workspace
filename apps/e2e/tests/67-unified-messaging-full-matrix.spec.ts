// Unified Messaging — full E2E/API matrix (API-level where UI fixtures unavailable)
import { test, expect } from "@playwright/test";
import { apiLogin, newRequest, USERS, API_BASE, authHeaders } from "./_helpers";

const MESSAGING = `${API_BASE}/api/messaging/conversations`;

test.describe("Unified Messaging full matrix", () => {
  test("admin lists conversations", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=5`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("unauthenticated returns 401", async () => {
    const req = await newRequest();
    const res = await req.get(MESSAGING);
    expect(res.status()).toBe(401);
  });

  test("buyer IDOR on foreign conversation", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const list = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(adminToken) });
    const data = await list.json() as { items: Array<{ id: string }> };
    const target = data.items[0]?.id;
    if (!target) return;
    const forbidden = await req.get(`${MESSAGING}/${target}`, { headers: authHeaders(buyerToken) });
    expect([403, 404]).toContain(forbidden.status());
  });

  test("supplier cannot see INTERNAL messages", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.supA1);
    const list = await req.get(`${MESSAGING}?limit=3`, { headers: authHeaders(token) });
    if (!list.ok()) return;
    const data = await list.json() as { items: Array<{ id: string }> };
    const convId = data.items[0]?.id;
    if (!convId) return;
    const msgs = await req.get(`${MESSAGING}/${convId}/messages`, { headers: authHeaders(token) });
    expect(msgs.ok()).toBeTruthy();
    const body = await msgs.json() as { items: Array<{ audienceScope: string }> };
    for (const m of body.items) {
      expect(m.audienceScope).not.toBe("INTERNAL");
    }
  });

  test("context filter query accepted", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?contextType=RFQ&limit=5`, { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
  });

  test("cursor pagination returns hasMore field", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${MESSAGING}?limit=2`, { headers: authHeaders(token) });
    const body = await res.json() as { hasMore: boolean; nextCursor: string | null };
    expect(typeof body.hasMore).toBe("boolean");
  });

  test("message list pagination shape", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const list = await req.get(`${MESSAGING}?limit=1`, { headers: authHeaders(token) });
    const data = await list.json() as { items: Array<{ id: string }> };
    const convId = data.items[0]?.id;
    if (!convId) return;
    const msgs = await req.get(`${MESSAGING}/${convId}/messages?limit=10`, { headers: authHeaders(token) });
    expect(msgs.ok()).toBeTruthy();
    const body = await msgs.json() as { items: unknown[]; hasMore: boolean };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.hasMore).toBe("boolean");
  });
});
