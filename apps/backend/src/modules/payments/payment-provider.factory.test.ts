import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "./payment.service.js";
import { StubPaymentProvider } from "./providers/stub.provider.js";

const h = vi.hoisted(() => ({
  isProd: false,
  onlineEnabled: false,
  paymentProvider: "stub" as "stub" | "stripe",
  nodeEnv: "test" as "development" | "test" | "production",
}));

vi.mock("../../config/env.js", () => ({
  get env() {
    return {
      NODE_ENV: h.nodeEnv,
      ONLINE_PAYMENTS_ENABLED: h.onlineEnabled,
      PAYMENT_PROVIDER: h.paymentProvider,
    };
  },
  get isProd() {
    return h.isProd;
  },
}));

describe("payment provider factory — production safety (PAY-001)", () => {
  const db = {
    workspace: { findUnique: vi.fn() },
    timelineEvent: { create: vi.fn() },
  } as never;

  beforeEach(() => {
    h.isProd = false;
    h.onlineEnabled = false;
    h.paymentProvider = "stub";
    h.nodeEnv = "test";
    vi.clearAllMocks();
  });

  it("blocks payment intent creation in production without online payments", async () => {
    h.isProd = true;
    h.nodeEnv = "production";
    const svc = new PaymentService(db);
    await expect(
      svc.createIntent("order-1", { amount: 100, currency: "USD" }),
    ).rejects.toMatchObject({ status: 503, code: "ONLINE_PAYMENTS_DISABLED" });
  });

  it("allows stub provider in test environment", async () => {
    h.nodeEnv = "test";
    (db.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "order-1",
      type: "ORDER",
      externalRef: "ORD-1",
      orderWorkspace: {},
    });
    (db.timelineEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const svc = new PaymentService(db, new StubPaymentProvider());
    const intent = await svc.createIntent("order-1", { amount: 100, currency: "USD" });
    expect(intent.id).toMatch(/^pi_stub_/);
  });

  it("rejects invalid amount", async () => {
    const svc = new PaymentService(db, new StubPaymentProvider());
    await expect(
      svc.createIntent("order-1", { amount: 0, currency: "USD" }),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_AMOUNT" });
  });

  it("reports capabilities with online collection disabled", () => {
    h.isProd = true;
    const svc = new PaymentService(db);
    const caps = svc.getCapabilities();
    expect(caps.onlineCollectionEnabled).toBe(false);
    expect(caps.paymentIntentApiEnabled).toBe(false);
    expect(caps.manualMilestoneTracking).toBe(true);
    expect(caps.message).toContain("not currently enabled");
  });

  it("blocks stub in production even when injected without override path", async () => {
    h.isProd = true;
    h.nodeEnv = "production";
    const svc = new PaymentService(db);
    await expect(
      svc.createIntent("order-1", { amount: 50, currency: "EUR" }),
    ).rejects.toMatchObject({ code: "ONLINE_PAYMENTS_DISABLED" });
  });
});
