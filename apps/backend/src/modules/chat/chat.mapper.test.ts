import { describe, it, expect } from "vitest";
import { mapMessageRow, resolveSenderType, sourceLabel } from "./chat.mapper.js";

describe("chat.mapper", () => {
  const conv = {
    buyerUserId: "buyer-1",
    peerUserId: "supplier-1",
    forwarderContactId: null,
  };

  it("resolveSenderType for buyer", () => {
    expect(resolveSenderType("BUYER", conv, "buyer-1")).toBe("buyer");
  });

  it("resolveSenderType for supplier", () => {
    expect(resolveSenderType("SUPPLIER", conv, "supplier-1")).toBe("supplier");
  });

  it("resolveSenderType for admin", () => {
    expect(resolveSenderType("ADMIN", conv, "admin-1")).toBe("admin");
  });

  it("maps message with source labels", () => {
    const row = mapMessageRow(
      {
        id: "m1",
        conversationId: "c1",
        authorUserId: "buyer-1",
        senderType: "buyer",
        senderPhone: null,
        channel: "whatsapp",
        source: "whatsapp",
        body: "Test",
        whatsappMessageId: "wamid.1",
        deliveryStatus: "sent",
        status: "sent",
        createdAt: new Date("2026-06-19T10:00:00Z"),
      },
      conv,
      "buyer-1",
      "BUYER",
    );
    expect(row.source).toBe("whatsapp");
    expect(row.senderType).toBe("buyer");
    expect(sourceLabel("whatsapp", "buyer")).toBe("WhatsApp");
    expect(sourceLabel("platform", "admin")).toBe("Admin");
  });
});
