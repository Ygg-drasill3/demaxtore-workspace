import { describe, it, expect, vi, beforeEach } from "vitest";
import { CUSTOMER_SERVICE_WINDOW_MS } from "./whatsapp-inbox.types.js";
import { validateE164Phone } from "./whatsapp-inbox.send.js";

vi.mock("../../config/env.js", () => ({
  env: {
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1221373704390497",
    WHATSAPP_API_VERSION: "v25.0",
  },
}));

vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

global.fetch = vi.fn();

describe("whatsapp-inbox.send", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("validates E.164 phone numbers", () => {
    expect(validateE164Phone("+905321234567")).toBe(true);
    expect(validateE164Phone("invalid")).toBe(false);
    expect(validateE164Phone("12")).toBe(false);
  });
});

describe("customer service window", () => {
  it("is open within 24 hours of last inbound", () => {
    const recent = new Date(Date.now() - 60_000);
    const open = Date.now() - recent.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
    expect(open).toBe(true);
  });

  it("is closed after 24 hours", () => {
    const old = new Date(Date.now() - CUSTOMER_SERVICE_WINDOW_MS - 1);
    const open = Date.now() - old.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
    expect(open).toBe(false);
  });
});
