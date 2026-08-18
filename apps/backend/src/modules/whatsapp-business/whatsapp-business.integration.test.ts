import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptSecret } from "../../lib/secret-crypto.js";
import { sendWhatsAppMessage } from "../whatsapp-inbox/whatsapp-inbox.send.js";
import { sendWhatsAppOutbound } from "../unified-messaging/unified-messaging.whatsapp-outbound.js";
import {
  assertBuyerCredentialIsolation,
  requireBuyerWhatsAppCredentials,
  resolveBuyerWhatsAppCredentials,
} from "./whatsapp-business-credential.resolver.js";
import { resolveInboundWorkspaceConversation } from "./whatsapp-conversation-resolver.service.js";

const SUPPLIER_PHONE = "905322222222";

const BUYER_A = {
  buyerId: "buyer-a-id",
  connectionId: "conn-a",
  phoneNumberId: "111111111111111",
  accessToken: "token-buyer-a",
  displayPhoneNumber: "+90 532 111 1111",
  wabaId: "waba-a",
  metaBusinessId: "biz-a",
  verifiedName: "Buyer A Corp",
};

const BUYER_B = {
  buyerId: "buyer-b-id",
  connectionId: "conn-b",
  phoneNumberId: "222222222222222",
  accessToken: "token-buyer-b",
  displayPhoneNumber: "+90 532 222 2222",
  wabaId: "waba-b",
  metaBusinessId: "biz-b",
  verifiedName: "Buyer B Corp",
};

vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    WHATSAPP_SENDER_MODE: "buyer_connection",
    WHATSAPP_ACCESS_TOKEN: "platform-token",
    WHATSAPP_PHONE_NUMBER_ID: "platform-phone-id",
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_RFQ_TEMPLATE_NAME: "rfq_outreach",
    WHATSAPP_RFQ_TEMPLATE_LANGUAGE: "en",
    WHATSAPP_CONNECTION_ENCRYPTION_KEY: "test-whatsapp-connection-encryption-key-32chars",
    JWT_SECRET: "test-jwt-secret-minimum-32-characters-long",
  },
  isBuyerConnectionWhatsAppMode: () => true,
  isProd: false,
}));

vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../whatsapp-inbox/whatsapp-conversation.util.js", () => ({
  resolveLatestInboundAt: vi.fn().mockResolvedValue(new Date()),
  resolveContactAndConversation: vi.fn(),
}));

global.fetch = vi.fn();

describe("multi-tenant WhatsApp BYOWA", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test123" }] }),
    } as Response);
  });

  it("Buyer A sends using Buyer A phoneNumberId and token", async () => {
    await sendWhatsAppMessage({
      to: SUPPLIER_PHONE,
      type: "text",
      text: "Hello from Buyer A",
      credentials: {
        accessToken: BUYER_A.accessToken,
        phoneNumberId: BUYER_A.phoneNumberId,
        buyerId: BUYER_A.buyerId,
      },
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toContain(`/${BUYER_A.phoneNumberId}/messages`);
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${BUYER_A.accessToken}` });
    const payload = JSON.parse(String(init?.body)) as { to: string };
    expect(payload.to).toBe(SUPPLIER_PHONE);
  });

  it("Buyer B sends using Buyer B credentials — not Buyer A", async () => {
    await sendWhatsAppMessage({
      to: SUPPLIER_PHONE,
      type: "text",
      text: "Hello from Buyer B",
      credentials: {
        accessToken: BUYER_B.accessToken,
        phoneNumberId: BUYER_B.phoneNumberId,
        buyerId: BUYER_B.buyerId,
      },
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toContain(`/${BUYER_B.phoneNumberId}/messages`);
    expect(url).not.toContain(BUYER_A.phoneNumberId);
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${BUYER_B.accessToken}` });
  });

  it("Buyer A cannot send using Buyer B credentials", async () => {
    const prisma = { whatsAppConnectionAuditLog: { create: vi.fn() } };
    await expect(
      assertBuyerCredentialIsolation(prisma as never, BUYER_A.buyerId, BUYER_B),
    ).rejects.toMatchObject({
      code: "WHATSAPP_CREDENTIAL_ISOLATION",
    });
  });

  it("resolves encrypted tenant credentials from database", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue({
          id: BUYER_A.connectionId,
          buyerId: BUYER_A.buyerId,
          phoneNumberId: BUYER_A.phoneNumberId,
          encryptedAccessToken: encryptSecret(BUYER_A.accessToken),
          displayPhoneNumber: BUYER_A.displayPhoneNumber,
          wabaId: BUYER_A.wabaId,
          metaBusinessId: BUYER_A.metaBusinessId,
          verifiedName: BUYER_A.verifiedName,
          status: "CONNECTED",
          tokenExpiresAt: new Date(Date.now() + 86400000),
        }),
        update: vi.fn(),
      },
      whatsAppConnectionAuditLog: { create: vi.fn() },
    };

    const creds = await resolveBuyerWhatsAppCredentials(prisma as never, BUYER_A.buyerId);
    expect(creds?.accessToken).toBe(BUYER_A.accessToken);
    expect(creds?.phoneNumberId).toBe(BUYER_A.phoneNumberId);
  });

  it("requires connected buyer credentials before outbound send", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      whatsAppConnectionAuditLog: { create: vi.fn() },
    };

    await expect(requireBuyerWhatsAppCredentials(prisma as never, BUYER_A.buyerId)).rejects.toMatchObject({
      code: "WHATSAPP_BUSINESS_NOT_CONNECTED",
    });
  });

  it("returns WHATSAPP_CONNECTION_REAUTH_REQUIRED for revoked connections", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue({ status: "REVOKED", buyerId: BUYER_A.buyerId }),
        update: vi.fn(),
      },
      whatsAppConnectionAuditLog: { create: vi.fn() },
    };

    await expect(requireBuyerWhatsAppCredentials(prisma as never, BUYER_A.buyerId)).rejects.toMatchObject({
      code: "WHATSAPP_CONNECTION_REAUTH_REQUIRED",
    });
  });

  it("webhook PHONE_A resolves to Buyer A conversation, not Buyer B", async () => {
    const prisma = {
      workspaceMessage: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      workspaceConversation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "conv-buyer-a",
            metadata: {
              buyerId: BUYER_A.buyerId,
              rfqSupplierWhatsAppPhone: SUPPLIER_PHONE,
            },
          },
        ]),
        findUnique: vi.fn(),
      },
      workspaceParticipant: { findMany: vi.fn().mockResolvedValue([]) },
      whatsAppConversation: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const result = await resolveInboundWorkspaceConversation(prisma as never, {
      phoneNumberId: BUYER_A.phoneNumberId,
      buyerId: BUYER_A.buyerId,
      supplierWaId: SUPPLIER_PHONE,
    });

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.workspaceConversationId).toBe("conv-buyer-a");
      expect(result.buyerId).toBe(BUYER_A.buyerId);
      expect(result.buyerId).not.toBe(BUYER_B.buyerId);
    }
  });

  it("unified outbound uses buyer tenant credentials end-to-end", async () => {
    const prisma = {
      whatsAppContact: { findUnique: vi.fn() },
      whatsAppConversation: { aggregate: vi.fn() },
      whatsAppBusinessConnection: { updateMany: vi.fn() },
      whatsAppConnectionTemplate: { findFirst: vi.fn().mockResolvedValue(null) },
      whatsAppConnectionAuditLog: { create: vi.fn() },
    };

    const result = await sendWhatsAppOutbound(prisma as never, {
      phone: SUPPLIER_PHONE,
      body: "RFQ message",
      conversationId: "conv-1",
      lastInboundAt: new Date(),
      credentials: BUYER_A,
    });

    expect(result.metaMessageId).toBe("wamid.test123");
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toContain(BUYER_A.phoneNumberId);
    expect(url).not.toContain(BUYER_B.phoneNumberId);
  });
});
