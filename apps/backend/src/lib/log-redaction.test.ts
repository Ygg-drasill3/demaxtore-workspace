import { describe, expect, it } from "vitest";
import { redactPasswordlessTokens, sanitizeProviderResponse } from "./log-redaction.js";

describe("log-redaction", () => {
  it("redacts token query params from URLs", () => {
    const raw = "https://app.demaxtore.com/access/conversation?token=eyJhbGciOiJIUzI1NiJ9.abc";
    expect(redactPasswordlessTokens(raw)).toBe(
      "https://app.demaxtore.com/access/conversation?token=[REDACTED]",
    );
  });

  it("never leaves raw token substrings in sanitized provider payloads", () => {
    const secret = "super-secret-token-value-1234567890";
    const out = sanitizeProviderResponse({ body: `link /access/conversation?token=${secret}` });
    expect(JSON.stringify(out)).not.toContain(secret);
    expect(JSON.stringify(out)).toContain("[REDACTED]");
  });
});
