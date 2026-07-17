import { describe, it, expect } from "vitest";
import {
  messagingDedupKey,
  shouldEmitDeliveryNotification,
} from "./messaging-notify.helper.js";

describe("messaging-notify.helper", () => {
  it("builds stable dedup keys per recipient", () => {
    const a = messagingDedupKey("message:new", "c1", "m1", "u1");
    const b = messagingDedupKey("message:new", "c1", "m1", "u2");
    expect(a).not.toBe(b);
    expect(a).toHaveLength(32);
  });

  it("only FAILED delivery status triggers notification", () => {
    expect(shouldEmitDeliveryNotification("FAILED")).toBe(true);
    expect(shouldEmitDeliveryNotification("READ")).toBe(false);
    expect(shouldEmitDeliveryNotification("DELIVERED")).toBe(false);
    expect(shouldEmitDeliveryNotification("SENT")).toBe(false);
  });
});
