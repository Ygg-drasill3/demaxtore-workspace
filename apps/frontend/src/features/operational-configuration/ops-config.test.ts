import { describe, expect, it } from "vitest";
import { OPS_AUTOMATION_RULE_KEYS } from "@dmx/contracts/operational-configuration";

describe("ops-config frontend contracts surface", () => {
  it("exposes known automation keys for admin UI", () => {
    expect(OPS_AUTOMATION_RULE_KEYS).toContain("shipment.booked");
    expect(OPS_AUTOMATION_RULE_KEYS).toContain("milestone.activate_next");
  });
});
