import crypto from "node:crypto";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env.js", () => ({
  env: {
    WHATSAPP_VERIFY_TOKEN: "demaxtore_whatsapp_2026",
    WHATSAPP_APP_SECRET: "test-whatsapp-app-secret-min-32-chars",
    WHATSAPP_API_VERSION: "v25.0",
    WHATSAPP_ACCESS_TOKEN: undefined,
    WHATSAPP_PHONE_NUMBER_ID: undefined,
    LOG_LEVEL: "silent",
    APP_BASE_URL: "http://localhost:3000",
  },
  isProd: false,
}));

import {
  normalizePhone,
  parseInboundWebhook,
  validateWebhookSignature,
  verifySubscription,
} from "./whatsapp.service.js";

function sign(body: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

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
    const secret = "test-whatsapp-app-secret-min-32-chars";
    const payload = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));

    it("accepts valid signature", () => {
      expect(validateWebhookSignature(payload, sign(payload.toString(), secret))).toEqual({ ok: true });
    });

    it("rejects missing signature", () => {
      expect(validateWebhookSignature(payload, undefined)).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_MISSING",
      });
    });

    it("rejects malformed signature prefix", () => {
      expect(validateWebhookSignature(payload, "sha1=deadbeef")).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_MALFORMED",
      });
    });

    it("rejects invalid signature", () => {
      const bad = `sha256=${"a".repeat(64)}`;
      expect(validateWebhookSignature(payload, bad)).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_INVALID",
      });
    });

    it("rejects modified body", () => {
      const sig = sign(payload.toString(), secret);
      const tampered = Buffer.from(payload.toString() + " ");
      expect(validateWebhookSignature(tampered, sig)).toEqual({
        ok: false,
        reason: "WHATSAPP_SIGNATURE_INVALID",
      });
    });

    it("rejects missing raw body", () => {
      expect(validateWebhookSignature(undefined, sign("{}", secret))).toEqual({
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
