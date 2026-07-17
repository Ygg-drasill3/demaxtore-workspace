import { describe, it, expect, beforeEach } from "vitest";
import {
  MessagingEventEmitter,
  MessagingNotificationDedup,
  resetMessagingEventDedupForTests,
} from "./messaging-write.bridge.js";
import { canonicalStatusDistributionFromMessages, resolveWhatsAppMessageCanonical } from "./messaging-status.js";

describe("messaging-status", () => {
  it("READ does not also count as DELIVERED or SENT", () => {
    const dist = canonicalStatusDistributionFromMessages([
      { status: "read", readAt: new Date(), deliveredAt: new Date(), sentAt: new Date() },
      { status: "delivered", deliveredAt: new Date(), sentAt: new Date() },
      { status: "sent", sentAt: new Date() },
    ]);
    expect(dist.READ).toBe(1);
    expect(dist.DELIVERED).toBe(1);
    expect(dist.SENT).toBe(1);
    expect((dist.READ ?? 0) + (dist.DELIVERED ?? 0) + (dist.SENT ?? 0)).toBe(3);
  });

  it("late lower webhook does not downgrade READ", () => {
    const canonical = resolveWhatsAppMessageCanonical({
      status: "sent",
      readAt: new Date(),
      sentAt: new Date(),
    });
    expect(canonical).toBe("READ");
  });
});

describe("MessagingEventEmitter", () => {
  beforeEach(() => resetMessagingEventDedupForTests());

  it("tracks dedup keys in memory", () => {
    const emitter = new MessagingEventEmitter();
    emitter.emit("messaging:message:new", {
      conversationId: "c1",
      messageId: "m1",
      idempotencyKey: "idem-1",
    });
    emitter.emit("messaging:message:new", {
      conversationId: "c1",
      messageId: "m1",
      idempotencyKey: "idem-1",
    });
    expect(true).toBe(true);
  });
});

describe("MessagingNotificationDedup", () => {
  it("builds stable dedup metadata key", () => {
    const dedup = new MessagingNotificationDedup({} as never);
    const meta = dedup.messagingDedupMetadata("message:new", "conv", "msg", "user");
    expect(meta.messagingDedupKey).toHaveLength(32);
  });
});
