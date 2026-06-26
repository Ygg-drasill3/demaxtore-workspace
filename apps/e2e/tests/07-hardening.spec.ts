// Sprint 3.9 — Production hardening (rate limit, socket ACL)
import { test, expect } from "@playwright/test";
import { io as ioClient, type Socket } from "socket.io-client";
import {
  apiLogin, newRequest, API_BASE, USERS, setupSubmittedRfq, assignAndPublish,
} from "./_helpers";

test.describe.serial("Rate limiting", () => {
  test("auth forgot-password burst returns 429 after threshold", async () => {
    const req = await newRequest();
    let saw429 = false;
    for (let i = 0; i < 55; i++) {
      const res = await req.post(`${API_BASE}/api/auth/forgot-password`, {
        data: { email: `nobody-${i}@example.com` },
      });
      if (res.status() === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
    const ok = await req.post(`${API_BASE}/api/auth/forgot-password`, {
      data: { email: USERS.buyer1.email },
    });
    expect([200, 429]).toContain(ok.status());
  });
});

test.describe.serial("Socket ACL", () => {
  let cachedOrderId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const list = await req.get(`${API_BASE}/api/rfq`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { items: Array<{ id: string }> };
    for (const rfq of list.items ?? []) {
      const spawned = await req.get(`${API_BASE}/api/rfq/${rfq.id}/spawned-orders`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      }).then((r) => r.json()) as Array<{ id: string }>;
      if (spawned[0]?.id) {
        cachedOrderId = spawned[0].id;
        return;
      }
    }
  });

  test("supplier can subscribe socket to ORDER workspace", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const orderId = cachedOrderId;
    test.skip(!orderId, "no order workspace — run 05-order-flow before hardening suite");

    const socket: Socket = ioClient(API_BASE, {
      path: "/socket.io",
      auth: { token: supplierToken },
      transports: ["websocket"],
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (e) => reject(e));
      setTimeout(() => reject(new Error("socket timeout")), 10_000);
    });
    const ack = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.emit("workspace:subscribe", orderId, (res: { ok: boolean; error?: string }) => resolve(res));
      setTimeout(() => resolve({ ok: false, error: "ACK_TIMEOUT" }), 10_000);
    });
    socket.disconnect();
    expect(ack.ok).toBe(true);
  });

  test("buyer2 socket subscribe denied on buyer1 RFQ", async () => {
    const req = await newRequest();
    const buyer1Token = await apiLogin(req, USERS.buyer1);
    const buyer2Token = await apiLogin(req, USERS.buyer2);
    const rfq = await setupSubmittedRfq(req, buyer1Token, "Socket deny RFQ");

    const socket: Socket = ioClient(API_BASE, {
      path: "/socket.io",
      auth: { token: buyer2Token },
      transports: ["websocket"],
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (e) => reject(e));
      setTimeout(() => reject(new Error("socket timeout")), 10_000);
    });
    const ack = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.emit("workspace:subscribe", rfq.id, (res: { ok: boolean; error?: string }) => resolve(res));
      setTimeout(() => resolve({ ok: false, error: "ACK_TIMEOUT" }), 10_000);
    });
    socket.disconnect();
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("FORBIDDEN");
  });
});
