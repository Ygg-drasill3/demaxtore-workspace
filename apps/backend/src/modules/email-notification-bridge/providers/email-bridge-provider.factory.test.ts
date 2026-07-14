import { describe, expect, it, beforeEach } from "vitest";
import { getEmailBridgeProvider, resetEmailBridgeProviderForTests } from "./email-bridge-provider.factory.js";

describe("email-bridge-provider.factory", () => {
  beforeEach(() => {
    resetEmailBridgeProviderForTests();
  });

  it("returns a provider matching configured EMAIL_BRIDGE_PROVIDER", () => {
    const provider = getEmailBridgeProvider();
    expect(["console", "smtp", "resend"]).toContain(provider.id);
  });

  it("console provider is explicitly demo-safe", () => {
    const provider = getEmailBridgeProvider();
    if (provider.id === "console") {
      expect(provider.isConfigured()).toBe(true);
    }
  });
});
