import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";

describe("UnifiedMessagingPolicy", () => {
  const prisma = {
    workspaceConversationParticipant: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(() => vi.clearAllMocks());

  it("buyer cannot read internal audience", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(policy.canReadAudience({ id: "u1", email: "b@x.com", role: "BUYER" }, "INTERNAL")).toBe(false);
    expect(policy.canReadAudience({ id: "u1", email: "b@x.com", role: "BUYER" }, "EXTERNAL")).toBe(true);
  });

  it("admin can read internal audience", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(policy.canReadAudience({ id: "a1", email: "a@x.com", role: "ADMIN" }, "INTERNAL")).toBe(true);
  });

  it("blocks whatsapp dispatch for internal audience", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(() => policy.assertCanDispatchToChannel("INTERNAL", "WHATSAPP")).toThrow();
  });

  it("blocks whatsapp dispatch for system audience", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(() => policy.assertCanDispatchToChannel("SYSTEM", "WHATSAPP")).toThrow();
  });

  it("allows workspace dispatch for external audience", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(() => policy.assertCanDispatchToChannel("EXTERNAL", "WORKSPACE")).not.toThrow();
  });

  it("supplier must be participant", async () => {
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue(null);
    const policy = new UnifiedMessagingPolicy(prisma as never);
    await expect(
      policy.assertSupplierIsolation({ id: "s1", email: "s@x.com", role: "SUPPLIER" }, "conv-1"),
    ).rejects.toThrow();
  });

  it("admin can assign conversations", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(policy.canAssignConversation({ id: "a1", email: "a@x.com", role: "ADMIN" })).toBe(true);
  });

  it("buyer cannot assign conversations", () => {
    const policy = new UnifiedMessagingPolicy(prisma as never);
    expect(policy.canAssignConversation({ id: "b1", email: "b@x.com", role: "BUYER" })).toBe(false);
  });
});
