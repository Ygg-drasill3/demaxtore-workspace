import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertWhatsAppRecipientAllowed,
  getWhatsAppBusinessPhoneE164,
  maskPhoneE164,
  resolveWhatsAppTargetPhone,
} from "./unified-messaging.whatsapp-target.js";

describe("unified-messaging.whatsapp-target", () => {
  const buyer = { id: "buyer-1", email: "buyer@test.com", role: "BUYER" as const };
  const supplier = { id: "supplier-1", email: "supplier@test.com", role: "SUPPLIER" as const };

  it("masks phone numbers for reporting", () => {
    expect(maskPhoneE164("905321234567")).toMatch(/^\+90532\*\*\*67$/);
  });

  it("blocks DeMaxtore business line as recipient", () => {
    const business = getWhatsAppBusinessPhoneE164();
    expect(() =>
      assertWhatsAppRecipientAllowed(business, buyer, {
        whatsappPhone: null,
        phoneNumber: "+905559999999",
      }),
    ).toThrow(/DeMaxtore WhatsApp Business line/);
  });

  it("blocks sender own phone as recipient", () => {
    expect(() =>
      assertWhatsAppRecipientAllowed("905321234567", buyer, {
        whatsappPhone: null,
        phoneNumber: "+905321234567",
      }),
    ).toThrow(/your own phone/);
  });

  it("resolves buyer RFQ target to supplier whatsappPhone only", async () => {
    const prisma = {
      workspaceConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          participants: [],
          contexts: [{ contextType: "RFQ", contextId: "ws-rfq-1" }],
          metadata: {},
        }),
      },
      workspaceParticipant: {
        findMany: vi.fn().mockResolvedValue([
          { userId: buyer.id, participantRole: "OWNER", user: { id: buyer.id, whatsappPhone: "+905551111111" } },
          {
            userId: supplier.id,
            participantRole: "COUNTERPARTY",
            user: { id: supplier.id, whatsappPhone: "+905322222222" },
          },
        ]),
      },
      rfqDetails: {
        findUnique: vi.fn().mockResolvedValue({ selectedSupplierUserId: supplier.id }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ whatsappPhone: "+905322222222" }),
      },
      supplierAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const phone = await resolveWhatsAppTargetPhone(prisma as never, "conv-1", buyer);
    expect(phone).toBe("905322222222");
    expect(phone).not.toBe(getWhatsAppBusinessPhoneE164());
    expect(phone).not.toBe("905551111111");
  });

  it("resolves supplier RFQ target to own whatsappPhone (thread mirror)", async () => {
    const prisma = {
      workspaceConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          participants: [
            { userId: supplier.id, leftAt: null, participantRole: "COUNTERPARTY", phoneE164: "+905322222222" },
          ],
          contexts: [{ contextType: "RFQ", contextId: "ws-rfq-1" }],
          metadata: {},
        }),
      },
      workspaceParticipant: {
        findMany: vi.fn().mockResolvedValue([
          { userId: buyer.id, participantRole: "OWNER", user: { id: buyer.id, whatsappPhone: "+905551111111" } },
          {
            userId: supplier.id,
            participantRole: "COUNTERPARTY",
            user: { id: supplier.id, whatsappPhone: "+905322222222" },
          },
        ]),
      },
      rfqDetails: { findUnique: vi.fn().mockResolvedValue(null) },
      user: {
        findUnique: vi.fn().mockResolvedValue({ whatsappPhone: "+905322222222" }),
      },
      supplierAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const phone = await resolveWhatsAppTargetPhone(prisma as never, "conv-1", supplier);
    expect(phone).toBe("905322222222");
    expect(phone).not.toBe("905551111111");
  });

  it("returns null for buyer when supplier whatsappPhone missing", async () => {
    const prisma = {
      workspaceConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          participants: [],
          contexts: [{ contextType: "RFQ", contextId: "ws-rfq-1" }],
          metadata: {},
        }),
      },
      workspaceParticipant: {
        findMany: vi.fn().mockResolvedValue([
          { userId: buyer.id, participantRole: "OWNER", user: { id: buyer.id, whatsappPhone: null } },
          {
            userId: supplier.id,
            participantRole: "COUNTERPARTY",
            user: { id: supplier.id, whatsappPhone: null },
          },
        ]),
      },
      rfqDetails: { findUnique: vi.fn().mockResolvedValue({ selectedSupplierUserId: supplier.id }) },
      user: { findUnique: vi.fn().mockResolvedValue({ whatsappPhone: null }) },
      supplierAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const phone = await resolveWhatsAppTargetPhone(prisma as never, "conv-1", buyer);
    expect(phone).toBeNull();
  });
});
