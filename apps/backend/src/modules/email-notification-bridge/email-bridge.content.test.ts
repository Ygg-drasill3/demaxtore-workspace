import { describe, expect, it } from "vitest";
import { resolveEmailSafeMessage, GENERIC_SUMMARY } from "./email-bridge.content.js";
import { resolveOperationalShape } from "../notification-engine/notification-engine.mapper.js";

describe("email-bridge.content", () => {
  it("uses generic summary for internal notes", () => {
    const shape = resolveOperationalShape("communication.internal_note", {}, undefined);
    const msg = resolveEmailSafeMessage({
      eventType: "communication.internal_note",
      message: "Confidential admin pricing note",
      shape,
      metadata: { sensitiveContent: true },
    });
    expect(msg).toBe(GENERIC_SUMMARY);
    expect(msg).not.toContain("Confidential");
  });

  it("escapes are handled in templates — plain message passes through when safe", () => {
    const shape = resolveOperationalShape("quotation.submitted", {}, undefined);
    const msg = resolveEmailSafeMessage({
      eventType: "quotation.submitted",
      message: "Updated pricing received.",
      shape,
      metadata: {},
    });
    expect(msg).toBe("Updated pricing received.");
  });
});
