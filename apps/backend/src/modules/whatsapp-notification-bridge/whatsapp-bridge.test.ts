import { describe, expect, it } from "vitest";
import { buildWhatsAppTemplateBody, maskPhoneForLog } from "./whatsapp-bridge.templates.js";
import { computeNextRetryAt } from "./whatsapp-bridge.service.js";
import { parseWhatsAppStatusWebhook } from "./whatsapp-bridge.webhook.js";
import { isWhatsAppDeliverableType } from "@dmx/contracts/whatsapp-notification-bridge";

describe("whatsapp-bridge.templates", () => {
  it("builds professional template without internal ids", () => {
    const t = buildWhatsAppTemplateBody({
      centerType: "NEW_SUPPLIER_MESSAGE",
      workspaceRef: "RFQ-1045",
      headline: "New message",
      detailLine: "Quotation updated.",
      counterpartyLabel: "ABC Foods",
    });
    expect(t.bodyText).toContain("RFQ-1045");
    expect(t.bodyText).toContain("ABC Foods");
    expect(t.bodyText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    expect(t.buttonLabel).toBe("Open Conversation");
  });

  it("masks phone numbers in logs", () => {
    expect(maskPhoneForLog("+905551234567")).toBe("***4567");
  });
});

describe("whatsapp-bridge.service", () => {
  it("computes exponential backoff", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const next = computeNextRetryAt(2, now);
    expect(next.getTime() - now.getTime()).toBe(4 * 60_000);
  });
});

describe("whatsapp-bridge.webhook", () => {
  it("parses delivery status updates", () => {
    const statuses = parseWhatsAppStatusWebhook({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            statuses: [{ id: "wamid.abc", status: "delivered" }],
          },
        }],
      }],
    });
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.status).toBe("delivered");
  });
});

describe("whatsapp contracts", () => {
  it("filters deliverable types", () => {
    expect(isWhatsAppDeliverableType("SHIPMENT_DELAYED")).toBe(true);
    expect(isWhatsAppDeliverableType("WORKSPACE_ASSIGNED")).toBe(false);
  });
});
