import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import { signHmacSha256 } from "../../middleware/webhook-signature.js";

// Mutable state controlling the mocked env across tests (C5 scenarios).
const h = vi.hoisted(() => ({
  state: {
    isProd: false as boolean,
    secret: undefined as string | undefined,
    enforceFlag: undefined as boolean | undefined,
  },
  claimProcessedEvent: vi.fn(),
  releaseProcessedEvent: vi.fn(),
  handleWebhook: vi.fn(),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    get PAYMENT_WEBHOOK_SECRET() {
      return h.state.secret;
    },
    get PAYMENT_WEBHOOK_ENFORCE_HMAC() {
      return h.state.enforceFlag;
    },
  },
  get isProd() {
    return h.state.isProd;
  },
}));

vi.mock("../../db/prisma.js", () => ({ prisma: {} }));
vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../lib/processed-event.js", () => ({
  claimProcessedEvent: h.claimProcessedEvent,
  releaseProcessedEvent: h.releaseProcessedEvent,
}));
vi.mock("./payment.service.js", () => ({
  PaymentService: vi.fn().mockImplementation(() => ({ handleWebhook: h.handleWebhook })),
}));

const { paymentWebhookRouter } = await import("./payment.webhook.routes.js");

function makeApp() {
  const app = express();
  app.use(express.raw({ type: () => true }));
  app.use("/api/payments/webhook", paymentWebhookRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; code?: string };
    res.status(e.status ?? 500).json({ code: e.code ?? "ERROR" });
  });
  return app;
}

const SECRET = "test-payment-secret";
const PAYLOAD = JSON.stringify({
  eventId: "evt-1",
  orderId: "order-1",
  eventType: "payment.succeeded",
  status: "succeeded",
});

function post(app: express.Express, body: string, signature?: string) {
  const req = request(app).post("/api/payments/webhook").set("content-type", "application/json");
  if (signature !== undefined) req.set("x-demaxtore-signature", signature);
  return req.send(body);
}

describe("payment webhook route — signature enforcement (C5) + no event loss (C4)", () => {
  beforeEach(() => {
    h.state.isProd = false;
    h.state.secret = undefined;
    h.state.enforceFlag = undefined;
    h.claimProcessedEvent.mockReset().mockResolvedValue(true);
    h.releaseProcessedEvent.mockReset().mockResolvedValue(undefined);
    h.handleWebhook.mockReset().mockResolvedValue(undefined);
  });

  it("C5: enforce on + no secret → 500, never touches payment layer", async () => {
    h.state.enforceFlag = true;
    h.state.secret = undefined;
    const res = await post(makeApp(), PAYLOAD, signHmacSha256(PAYLOAD, SECRET));
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("PAYMENT_WEBHOOK_SECRET_NOT_CONFIGURED");
    expect(h.handleWebhook).not.toHaveBeenCalled();
    expect(h.claimProcessedEvent).not.toHaveBeenCalled();
  });

  it("C5: enforce on + secret set + MISSING signature → 401", async () => {
    h.state.enforceFlag = true;
    h.state.secret = SECRET;
    const res = await post(makeApp(), PAYLOAD); // no signature header
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_WEBHOOK_SIGNATURE");
    expect(h.handleWebhook).not.toHaveBeenCalled();
  });

  it("C5: enforce on + secret set + INVALID signature → 401", async () => {
    h.state.enforceFlag = true;
    h.state.secret = SECRET;
    const res = await post(makeApp(), PAYLOAD, "sha256=deadbeef");
    expect(res.status).toBe(401);
    expect(h.handleWebhook).not.toHaveBeenCalled();
  });

  it("C5: production cannot disable HMAC via flag=false (missing signature still 401)", async () => {
    h.state.isProd = true;
    h.state.enforceFlag = false; // operator footgun — must be ignored in prod
    h.state.secret = SECRET;
    const res = await post(makeApp(), PAYLOAD); // no signature
    expect(res.status).toBe(401);
    expect(h.handleWebhook).not.toHaveBeenCalled();
  });

  it("C5: valid signature → 200 and processes once", async () => {
    h.state.enforceFlag = true;
    h.state.secret = SECRET;
    const res = await post(makeApp(), PAYLOAD, signHmacSha256(PAYLOAD, SECRET));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(h.handleWebhook).toHaveBeenCalledTimes(1);
  });

  it("duplicate event (claim returns false) → 200 duplicate:true, no reprocess", async () => {
    h.state.enforceFlag = true;
    h.state.secret = SECRET;
    h.claimProcessedEvent.mockResolvedValue(false);
    const res = await post(makeApp(), PAYLOAD, signHmacSha256(PAYLOAD, SECRET));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, duplicate: true });
    expect(h.handleWebhook).not.toHaveBeenCalled();
  });

  it("C4: processing failure releases the claim so the event is not lost", async () => {
    h.state.enforceFlag = true;
    h.state.secret = SECRET;
    h.handleWebhook.mockRejectedValue(new Error("downstream boom"));
    const res = await post(makeApp(), PAYLOAD, signHmacSha256(PAYLOAD, SECRET));
    expect(res.status).toBe(500);
    expect(h.claimProcessedEvent).toHaveBeenCalledTimes(1);
    expect(h.releaseProcessedEvent).toHaveBeenCalledWith({}, "webhook:payment", "evt-1");
  });
});
