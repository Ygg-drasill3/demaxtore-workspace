import { describe, expect, it } from "vitest";
import { buildOperationalEmailTemplate, maskEmailForLog } from "./email-bridge.templates.js";
import { computeEmailRetryAt } from "./email-bridge.service.js";
import { isEmailDeliverableType } from "@dmx/contracts/email-notification-bridge";

import { describe, expect, it } from "vitest";
import { buildOperationalEmailTemplate, maskEmailForLog } from "./email-bridge.templates.js";
import { computeEmailRetryAt } from "./email-bridge.service.js";
import { isEmailDeliverableType } from "@dmx/contracts/email-notification-bridge";
import { redactPasswordlessTokens } from "../../lib/log-redaction.js";

describe("email-bridge.templates", () => {
  it("builds enterprise HTML without internal UUIDs", () => {
    const t = buildOperationalEmailTemplate({
      centerType: "QUOTATION_SUBMITTED",
      priority: "HIGH",
      workspaceRef: "RFQ-1045",
      workspaceType: "RFQ",
      buyerLabel: "Acme Imports",
      supplierLabel: "ABC Foods",
      title: "Quotation submitted",
      message: "Updated pricing received.",
      occurredAt: "2026-07-13T12:00:00.000Z",
      openConversationUrl: "https://app.demaxtore.com/access/conversation?token=abc",
    });
    expect(t.subject).toContain("RFQ-1045");
    expect(t.html).toContain("Open Conversation");
    expect(t.html).toContain("Acme Imports");
    expect(t.html).toContain("prefers-color-scheme: dark");
    expect(t.html).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i);
    expect(t.text).toContain("Do not reply to this email");
    expect(redactPasswordlessTokens(t.text)).not.toContain("token=abc");
  });

  it("masks email in logs", () => {
    expect(maskEmailForLog("buyer@acme.com")).toBe("b***r@acme.com");
  });
});

describe("email-bridge.service", () => {
  it("computes exponential backoff", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const next = computeEmailRetryAt(1, now);
    expect(next.getTime() - now.getTime()).toBe(2 * 60_000);
  });
});

describe("email contracts", () => {
  it("includes workspace assigned type", () => {
    expect(isEmailDeliverableType("WORKSPACE_ASSIGNED")).toBe(true);
    expect(isEmailDeliverableType("UNKNOWN")).toBe(false);
  });
});
