// Sprint 07 — SmartContainer access control validation
import { test, expect } from "@playwright/test";
import { USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe("SmartContainer access control (Sprint 07)", () => {
  let containerId = "";
  let buyer1Token = "";
  let buyer2Token = "";
  let supplierToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyer1Token = await apiLogin(req, USERS.buyer1);
    buyer2Token = await apiLogin(req, USERS.buyer2);
    supplierToken = await apiLogin(req, USERS.supA1);

    const create = await req.post(`${API_BASE}/api/mixed-containers`, {
      headers: { Authorization: `Bearer ${buyer1Token}` },
      data: { containerType: "CONTAINER_40FT", currency: "USD" },
    });
    containerId = (await create.json()).id;
  });

  test("Buyer2 cannot access Buyer1 SmartContainer", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyer2Token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("Buyer2 cannot access Buyer1 organization", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/organization`, {
      headers: { Authorization: `Bearer ${buyer2Token}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("Supplier cannot access SmartContainer", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("Unauthenticated request is rejected", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`);
    expect(res.status()).toBe(401);
  });

  test("Buyer cannot access admin procurement endpoint", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/admin/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyer1Token}` },
    });
    expect(res.status()).toBe(403);
  });
});
