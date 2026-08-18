import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatWhatsAppOutboundBody,
  sendWhatsAppOutbound,
} from "./unified-messaging.whatsapp-outbound.js";
import {
  getWhatsAppBusinessPhoneE164,
  maskPhoneE164,
} from "./unified-messaging.whatsapp-target.js";

const SUPPLIER_PHONE = "905322222222";

const TENANT_CREDENTIALS = {
  buyerId: "buyer-a-id",
  phoneNumberId: "1221373704390497",
  accessToken: "test-token",
  displayPhoneNumber: "+90 532 111 1111",
  wabaId: "waba-a",
  metaBusinessId: "biz-a",
  verifiedName: "Buyer A",
};

vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1221373704390497",
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_RFQ_TEMPLATE_NAME: "rfq_outreach",
    WHATSAPP_RFQ_TEMPLATE_LANGUAGE: "en",
    JWT_SECRET: "test-jwt-secret-minimum-32-characters-long",
  },
}));

vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../whatsapp-inbox/whatsapp-conversation.util.js", () => ({
  resolveLatestInboundAt: vi.fn().mockResolvedValue(new Date()),
  resolveContactAndConversation: vi.fn(),
}));

global.fetch = vi.fn();

describe("supplier WhatsApp outbound integration", () => {
  it("formats outbound text as sender name + message", () => {
    expect(formatWhatsAppOutboundBody("Buyer One Acme", "utyu")).toBe("Buyer One Acme: utyu");
    expect(formatWhatsAppOutboundBody(null, "utyu")).toBe("utyu");
  });

  const prisma = {
    whatsAppContact: { findUnique: vi.fn() },
    whatsAppConversation: { aggregate: vi.fn() },
    whatsAppBusinessConnection: { updateMany: vi.fn() },
  };

  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test123" }] }),
    } as Response);
  });

  it("sends Meta payload with to === supplier.whatsappPhone", async () => {
    const result = await sendWhatsAppOutbound(prisma as never, {
      phone: SUPPLIER_PHONE,
      body: "Hello supplier",
      conversationId: "conv-1",
      senderName: "Buyer One Acme",
      rfqRef: "RFQ-001",
      lastInboundAt: new Date(),
      credentials: TENANT_CREDENTIALS,
    });

    expect(result.metaMessageId).toBe("wamid.test123");
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toContain(`/${TENANT_CREDENTIALS.phoneNumberId}/messages`);
    expect(init?.method).toBe("POST");

    const payload = JSON.parse(String(init?.body)) as {
      to: string;
      messaging_product: string;
      text?: { body: string };
    };
    expect(payload.to).toBe(SUPPLIER_PHONE);
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.text?.body).toBe("Buyer One Acme: Hello supplier");
  });

  it("to !== businessPhone", async () => {
    await sendWhatsAppOutbound(prisma as never, {
      phone: SUPPLIER_PHONE,
      body: "Test",
      conversationId: "conv-1",
      lastInboundAt: new Date(),
      credentials: TENANT_CREDENTIALS,
    });

    const init = vi.mocked(fetch).mock.calls[0]![1];
    const payload = JSON.parse(String(init?.body)) as { to: string };
    const business = getWhatsAppBusinessPhoneE164();

    expect(payload.to).toBe(SUPPLIER_PHONE);
    expect(payload.to).not.toBe(business);

    const maskedTo = maskPhoneE164(payload.to);
    expect(maskedTo).toMatch(/^\+90532\*\*\*22$/);
  });
});
