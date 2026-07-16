import { describe, it, expect, vi } from "vitest";

import { createHmac } from "node:crypto";

vi.mock("../../config/env.js", () => ({
  env: {
    WHATSAPP_VERIFY_TOKEN: "demaxtore_whatsapp_2026",
    WHATSAPP_APP_SECRET: "test-secret",
    WHATSAPP_API_VERSION: "v25.0",
    WHATSAPP_ACCESS_TOKEN: undefined,
    WHATSAPP_PHONE_NUMBER_ID: undefined,
    LOG_LEVEL: "silent",
    APP_BASE_URL: "http://localhost:3000",
  },
  isProd: false,
}));

import { normalizePhone, parseInboundWebhook, verifySubscription, validateWebhookSignature } from "./whatsapp.service.js";

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

  describe("verifySubscription", () => {
    it("returns challenge when mode, token, and challenge are valid", () => {
      expect(
        verifySubscription("subscribe", "demaxtore_whatsapp_2026", "123456"),
      ).toBe("123456");
    });

    it("returns null for wrong token", () => {
      expect(verifySubscription("subscribe", "wrong", "123456")).toBeNull();
    });

    it("returns null when challenge is missing", () => {
      expect(
        verifySubscription("subscribe", "demaxtore_whatsapp_2026", undefined),
      ).toBeNull();
    });

    it("returns null for non-subscribe mode", () => {
      expect(
        verifySubscription("unsubscribe", "demaxtore_whatsapp_2026", "123456"),
      ).toBeNull();
    });
  });

  describe("validateWebhookSignature", () => {
    const secret = "test-secret";
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const sign = (buf: Buffer) =>
      `sha256=${createHmac("sha256", secret).update(buf).digest("hex")}`;

    it("accepts valid signature", () => {
      expect(validateWebhookSignature(body, sign(body)).ok).toBe(true);
    });

    it("rejects missing signature", () => {
      expect(validateWebhookSignature(body, undefined)).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_MISSING",
      });
    });

    it("rejects malformed signature", () => {
      expect(validateWebhookSignature(body, "sha256=not-hex")).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_MALFORMED",
      });
    });

    it("rejects invalid signature", () => {
      expect(validateWebhookSignature(body, sign(Buffer.from("{}")))).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_INVALID",
      });
    });

    it("rejects missing raw body", () => {
      expect(validateWebhookSignature(undefined, sign(body))).toEqual({
        ok: false,
        reason: "WHATSAPP_RAW_BODY_MISSING",
      });
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
