import { describe, expect, it } from "vitest";
import {
  matchesCategory,
  resolveOperationalShape,
  snoozeUntil,
  buildActions,
  prioritySortKey,
} from "./notification-engine.mapper.js";

describe("notification-engine.mapper", () => {
  it("maps communication mention events to buyer/supplier center types", () => {
    const buyer = resolveOperationalShape("communication.mentioned.buyer", {});
    expect(buyer.centerType).toBe("BUYER_MENTIONED");
    expect(buyer.priority).toBe("HIGH");

    const supplier = resolveOperationalShape("communication.mentioned.supplier", {});
    expect(supplier.centerType).toBe("SUPPLIER_MENTIONED");
  });

  it("maps FSM audit tail events", () => {
    const shape = resolveOperationalShape("RFQ:rfq.submitted", {});
    expect(shape.centerType).toBe("APPROVAL_REQUIRED");
    expect(shape.priority).toBe("CRITICAL");
  });

  it("maps conversation hub system events via metadata", () => {
    const shape = resolveOperationalShape("system.quotation_submitted", {
      systemEventType: "QUOTATION_SUBMITTED",
    });
    expect(shape.centerType).toBe("QUOTATION_SUBMITTED");
    expect(shape.category).toBe("WORKSPACE");
  });

  it("filters categories including archived and snooze", () => {
    const shape = resolveOperationalShape("communication.message.created", {});
    expect(matchesCategory("MESSAGES", shape, false, {})).toBe(true);
    expect(matchesCategory("SHIPMENT", shape, false, {})).toBe(false);
    expect(matchesCategory("ARCHIVED", shape, true, { archivedAt: new Date().toISOString() })).toBe(true);
    expect(matchesCategory("UNREAD", shape, false, {
      snoozedUntil: new Date(Date.now() + 60_000).toISOString(),
    })).toBe(false);
  });

  it("computes snooze windows", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const fifteen = snoozeUntil("FIFTEEN_MINUTES", now);
    expect(fifteen.getTime() - now.getTime()).toBe(15 * 60_000);

    const tomorrow = snoozeUntil("TOMORROW", now);
    expect(tomorrow.getDate()).toBe(14);
  });

  it("builds quick actions for shipment notifications", () => {
    const actions = buildActions({
      centerType: "SHIPMENT_DELAYED",
      link: "/workspace/shipment/abc",
      workspaceType: "SHIPMENT",
      workspaceId: "abc",
    });
    expect(actions.some((a) => a.type === "OPEN_SHIPMENT")).toBe(true);
    expect(actions.some((a) => a.type === "DISMISS")).toBe(true);
  });

  it("sorts critical before information", () => {
    expect(prioritySortKey("CRITICAL")).toBeLessThan(prioritySortKey("INFORMATION"));
  });
});
