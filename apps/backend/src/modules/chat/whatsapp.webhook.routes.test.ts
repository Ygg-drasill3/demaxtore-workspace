import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "node:crypto";

const h = vi.hoisted(() => ({
  verifyToken: "demaxtore_whatsapp_2026" as string | undefined,
  appSecret: "test-whatsapp-app-secret-min-32-chars" as string | undefined,
  processWebhookPayload: vi.fn(),
  ingestInbound: vi.fn(),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    get WHATSAPP_VERIFY_TOKEN() { return h.verifyToken; },
    get WHATSAPP_APP_SECRET() { return h.appSecret; },
  },
}));

vi.mock("../../db/prisma.js", () => ({ prisma: {} }));
vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("./chat.service.js", () => ({
  TradeChatService: vi.fn().mockImplementation(() => ({
    ingestInbound: h.ingestInbound,
  })),
}));
vi.mock("../whatsapp-inbox/whatsapp-inbox.service.js", () => ({
  WhatsAppInboxService: vi.fn().mockImplementation(() => ({
    processWebhookPayload: h.processWebhookPayload,
  })),
}));
vi.mock("../whatsapp-notification-bridge/whatsapp-bridge.webhook.js", () => ({
  parseWhatsAppStatusWebhook: vi.fn(() => []),
}));
vi.mock("../whatsapp-notification-bridge/whatsapp-bridge.service.js", () => ({
  updateDeliveryStatusFromWebhook: vi.fn(),
}));

const { whatsappWebhookRouter } = await import("./whatsapp.webhook.routes.js");

function makeApp() {
  const app = express();
  app.use(express.raw({ type: "application/json" }));
  app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);
  return app;
}

function sign(body: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("whatsapp webhook routes — inbox integration", () => {
  beforeEach(() => {
    h.verifyToken = "demaxtore_whatsapp_2026";
    h.appSecret = "test-whatsapp-app-secret-min-32-chars";
    h.processWebhookPayload.mockReset().mockResolvedValue({ inbound: 1, statuses: 0 });
    h.ingestInbound.mockReset().mockResolvedValue(null);
  });

  describe("GET verification", () => {
    it("returns 200 with challenge for valid token", async () => {
      const res = await request(makeApp())
        .get("/api/webhooks/whatsapp")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "demaxtore_whatsapp_2026",
          "hub.challenge": "123456",
        });
      expect(res.status).toBe(200);
      expect(res.text).toBe("123456");
    });

    it("returns 403 for wrong token", async () => {
      const res = await request(makeApp())
        .get("/api/webhooks/whatsapp")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong",
          "hub.challenge": "123456",
        });
      expect(res.status).toBe(403);
    });
  });

  describe("POST webhook", () => {
  it("returns 200 immediately for valid signed payload", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const res = await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .set("content-type", "application/json")
      .set("x-hub-signature-256", sign(payload, h.appSecret!))
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    await new Promise((r) => setImmediate(r));
    expect(h.processWebhookPayload).toHaveBeenCalled();
  });

  it("returns 401 for missing signature", async () => {
    const payload = "{}";
    const res = await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .set("content-type", "application/json")
      .send(payload);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("WHATSAPP_SIGNATURE_MISSING");
  });

  it("returns 403 for invalid signature", async () => {
    const payload = "{}";
    const res = await request(makeApp())
      .post("/api/webhooks/whatsapp")
      .set("content-type", "application/json")
      .set("x-hub-signature-256", `sha256=${"b".repeat(64)}`)
      .send(payload);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("WHATSAPP_SIGNATURE_INVALID");
  });
  });
});
