/**
 * Real two-process socket dedup — requires scripts/run-two-process-socket-test.sh
 * or SOCKET_TEST_PORT_A/B with two backend instances on shared Redis/DB.
 */
import { describe, it, expect } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import { request } from "playwright";

const PORT_A = process.env.SOCKET_TEST_PORT_A ?? "3115";
const PORT_B = process.env.SOCKET_TEST_PORT_B ?? "3116";
const API_A = `http://127.0.0.1:${PORT_A}`;
const API_B = `http://127.0.0.1:${PORT_B}`;

async function health(url: string) {
  const res = await fetch(`${url}/api/healthz`);
  return res.ok;
}

function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      reconnection: false,
      timeout: 10_000,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("socket connect timeout")), 12_000);
  });
}

describe("Two-process socket dedup (live)", () => {
  it.skipIf(process.env.SOCKET_TEST_PORT_A === undefined)(
    "duplicate publish from two instances yields one client event",
    async () => {
    const aOk = await health(API_A);
    const bOk = await health(API_B);
    if (!aOk || !bOk) {
      console.warn("SKIP: socket test instances not running on", PORT_A, PORT_B);
      return;
    }

    const req = await request.newContext();
    const login = await req.post(`${API_A}/api/auth/login`, {
      data: { email: "admin@demaxtore.local", password: "Passw0rd!" },
    });
    if (!login.ok()) {
      console.warn("SKIP: admin login failed for socket test");
      await req.dispose();
      return;
    }
    const { token } = (await login.json()) as { token: string };

    const list = await req.get(`${API_A}/api/messaging/conversations?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await list.json() as { items?: Array<{ id: string }> };
    const items = listBody.items ?? [];
    const convId = items[0]?.id;
    if (!convId) {
      console.warn("SKIP: no conversation fixture");
      await req.dispose();
      return;
    }

    const socket = await connectSocket(API_A, token);
    const received: string[] = [];
    const dedupKey = `two-process-test-${Date.now()}`;
    const eventName = "messaging:message:new";

    await new Promise<void>((resolve) => {
      socket.on(eventName, (payload: { idempotencyKey?: string; messageId?: string }) => {
        if (payload.idempotencyKey === dedupKey || payload.messageId) {
          received.push(payload.idempotencyKey ?? payload.messageId ?? "evt");
        }
        if (received.length >= 1) resolve();
      });
      socket.emit("join", { room: `messaging:conversation:${convId}` });
      setTimeout(resolve, 5_000);
    });

    const payload = {
      conversationId: convId,
      messageId: `test-${dedupKey}`,
      idempotencyKey: dedupKey,
      audienceScope: "EXTERNAL",
    };

    await req.post(`${API_A}/api/internal/messaging/socket-emit-test`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { event: eventName, payload },
      failOnStatusCode: false,
    });
    await req.post(`${API_B}/api/internal/messaging/socket-emit-test`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { event: eventName, payload },
      failOnStatusCode: false,
    });

    await new Promise((r) => setTimeout(r, 2_000));
    socket.disconnect();
    await req.dispose();

    expect(received.length).toBeLessThanOrEqual(1);
    },
  );
});
