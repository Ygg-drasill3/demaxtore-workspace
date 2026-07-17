/**
 * Real two-process socket dedup — requires scripts/run-two-process-socket-test.sh
 * or SOCKET_TEST_PORT_A/B with two backend instances on shared Redis/DB.
 */
import { describe, it, expect } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import { request } from "playwright";
import { SocketEvents } from "@dmx/contracts";
import { SOCKET_TEST_CONVERSATION_ID } from "../../../scripts/seed-socket-test-fixture.js";
import { TEST_PASSWORD, TEST_USER_EMAILS } from "../../test/fixture-users.js";

const PORT_A = process.env.SOCKET_TEST_PORT_A ?? "3115";
const PORT_B = process.env.SOCKET_TEST_PORT_B ?? "3116";
const API_A = `http://127.0.0.1:${PORT_A}`;
const API_B = `http://127.0.0.1:${PORT_B}`;
const E2E_SECRET = process.env.E2E_TEST_SECRET ?? "";

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

function subscribeConversation(socket: Socket, conversationId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit(SocketEvents.MESSAGING_CONVERSATION_SUBSCRIBE, conversationId, (res: { ok: boolean; error?: string }) => {
      if (res?.ok) resolve();
      else reject(new Error(res?.error ?? "subscribe failed"));
    });
    setTimeout(() => reject(new Error("subscribe ack timeout")), 5_000);
  });
}

describe("Two-process socket dedup (live)", () => {
  it.skipIf(process.env.SOCKET_TEST_PORT_A === undefined)(
    "duplicate publish from two instances yields one client event",
    async () => {
      expect(E2E_SECRET.length).toBeGreaterThanOrEqual(32);

      const aOk = await health(API_A);
      const bOk = await health(API_B);
      expect(aOk, `instance A not healthy on ${PORT_A}`).toBe(true);
      expect(bOk, `instance B not healthy on ${PORT_B}`).toBe(true);

      const req = await request.newContext();
      const login = await req.post(`${API_A}/api/auth/login`, {
        data: { email: TEST_USER_EMAILS.admin, password: TEST_PASSWORD },
      });
      expect(login.ok(), "admin login failed for socket test").toBe(true);
      const { accessToken } = (await login.json()) as { accessToken: string };
      const token = accessToken;

      const convId = SOCKET_TEST_CONVERSATION_ID;
      const socket = await connectSocket(API_A, token);
      const received: Array<{ idempotencyKey?: string; messageId?: string }> = [];
      const dedupKey = `two-process-test-${Date.now()}`;
      const eventName = "messaging:message:new";

      await subscribeConversation(socket, convId);

      const done = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 8_000);
        socket.on(eventName, (payload: { idempotencyKey?: string; messageId?: string }) => {
          if (payload.idempotencyKey === dedupKey) {
            received.push(payload);
            clearTimeout(timer);
            resolve();
          }
        });
      });

      const payload = {
        conversationId: convId,
        messageId: `test-${dedupKey}`,
        idempotencyKey: dedupKey,
        audienceScope: "EXTERNAL",
      };

      const headers = {
        Authorization: `Bearer ${token}`,
        "x-e2e-test-secret": E2E_SECRET,
      };

      const emitA = await req.post(`${API_A}/api/internal/messaging/socket-emit-test`, {
        headers,
        data: { event: eventName, payload },
      });
      const emitB = await req.post(`${API_B}/api/internal/messaging/socket-emit-test`, {
        headers,
        data: { event: eventName, payload },
      });
      expect(emitA.ok(), "socket emit test route A failed").toBe(true);
      expect(emitB.ok(), "socket emit test route B failed").toBe(true);

      await done;
      await new Promise((r) => setTimeout(r, 500));
      socket.disconnect();
      await req.dispose();

      expect(received.length).toBe(1);
      expect(received[0]?.idempotencyKey).toBe(dedupKey);
    },
  );
});
