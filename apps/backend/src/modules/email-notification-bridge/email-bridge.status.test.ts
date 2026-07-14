import { describe, expect, it } from "vitest";
import { canTransitionDeliveryStatus } from "./email-bridge.status.js";

describe("email-bridge.status", () => {
  it("allows QUEUED → SENT and SENT → OPENED", () => {
    expect(canTransitionDeliveryStatus("QUEUED", "SENT")).toBe(true);
    expect(canTransitionDeliveryStatus("SENT", "OPENED")).toBe(true);
  });

  it("rejects OPENED over FAILED", () => {
    expect(canTransitionDeliveryStatus("FAILED", "OPENED")).toBe(false);
  });

  it("allows FAILED → SENT on retry success", () => {
    expect(canTransitionDeliveryStatus("FAILED", "SENT")).toBe(true);
  });

  it("treats duplicate OPENED as idempotent", () => {
    expect(canTransitionDeliveryStatus("OPENED", "OPENED")).toBe(true);
  });
});
