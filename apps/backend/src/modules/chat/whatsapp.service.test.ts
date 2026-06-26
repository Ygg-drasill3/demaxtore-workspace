import { describe, it, expect } from "vitest";
import { normalizePhone, parseInboundWebhook } from "./whatsapp.service.js";

describe("whatsapp.service", () => {
  describe("normalizePhone", () => {
    it("strips non-digits", () => {
      expect(normalizePhone("+90 532 123 45 67")).toBe("905321234567");
    });
    it("returns null for empty", () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone("")).toBeNull();
    });
  });

  describe("parseInboundWebhook", () => {
    it("parses text message events", () => {
      const body = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      id: "wamid.abc",
                      from: "905321234567",
                      type: "text",
                      text: { body: "Merhaba" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      const items = parseInboundWebhook(body);
      expect(items).toHaveLength(1);
      expect(items[0].messageText).toBe("Merhaba");
      expect(items[0].whatsappMessageId).toBe("wamid.abc");
    });
  });
});
