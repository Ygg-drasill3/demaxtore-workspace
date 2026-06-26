import { describe, it, expect } from "vitest";
import { hasPermission } from "@dmx/contracts/rbac-expanded";

describe("rbac-expanded", () => {
  it("grants finance operator payment manage", () => {
    expect(hasPermission("FINANCE_OPERATOR", "payment:manage")).toBe(true);
    expect(hasPermission("FINANCE_OPERATOR", "shipment:milestone")).toBe(false);
  });

  it("forwarder can submit milestones only", () => {
    expect(hasPermission("FORWARDER", "shipment:forwarder_submit")).toBe(true);
    expect(hasPermission("FORWARDER", "payment:manage")).toBe(false);
  });
});
