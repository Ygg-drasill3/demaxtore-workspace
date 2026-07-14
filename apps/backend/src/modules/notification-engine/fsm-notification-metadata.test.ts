import { describe, expect, it } from "vitest";
import { buildFsmNotificationMetadata } from "./fsm-notification-metadata.js";

describe("fsm-notification-metadata", () => {
  it("maps order inspection events to deliverable center types", () => {
    const meta = buildFsmNotificationMetadata({
      auditEvent: "order.inspection.requested",
      commWorkspaceType: "ORDER",
      commWorkspaceId: "00000000-0000-0000-0000-000000000101",
      workspaceRef: "ORD-1001",
    }) as { centerType?: string; commWorkspaceType?: string };
    expect(meta.centerType).toBe("INSPECTION_SCHEDULED");
    expect(meta.commWorkspaceType).toBe("ORDER");
  });

  it("maps shipment delivered events", () => {
    const meta = buildFsmNotificationMetadata({
      auditEvent: "shipment.delivered",
      commWorkspaceType: "SHIPMENT",
      commWorkspaceId: "00000000-0000-0000-0000-000000000202",
    }) as { centerType?: string };
    expect(meta.centerType).toBe("SHIPMENT_DELIVERED");
  });
});
