import { describe, it, expect } from "vitest";
import { formatScript } from "./workspace-scripts";
import { orderScriptFor, orderMilestones } from "./order.scripts";
import { freightiqScriptFor, freightPhase, freightMilestones } from "./freightiq.scripts";
import { shipmentScriptFor, shipmentProgressPercent } from "./shipment.scripts";
import { commoditybidScriptFor } from "./commoditybid.scripts";

describe("workspace scripts", () => {
  it("formatScript substitutes variables", () => {
    expect(formatScript("Hello {{name}}", { name: "Buyer" })).toBe("Hello Buyer");
    expect(formatScript("Missing {{x}}", {})).toBe("Missing {{x}}");
  });

  it("orderScriptFor returns buyer production_completed script", () => {
    const s = orderScriptFor("PRODUCTION_COMPLETED", "BUYER");
    expect(s?.primaryAction).toBe("request_inspection");
    expect(s?.mood).toBe("action");
  });

  it("orderMilestones marks current step", () => {
    const m = orderMilestones("FREIGHT_REQUESTED");
    expect(m.find((x) => x.key === "freight")?.status).toBe("current");
  });

  it("freightPhase resolves empty and quoted", () => {
    expect(freightPhase(true, null)).toBe("empty");
    expect(freightPhase(false, null)).toBe("not_eligible");
    expect(freightPhase(true, "QUOTED")).toBe("QUOTED");
  });

  it("freightiqScriptFor returns create action for empty", () => {
    const s = freightiqScriptFor("empty", "BUYER");
    expect(s.primaryAction).toBe("create_freight_request");
  });

  it("freightMilestones tracks sourcing phase", () => {
    const m = freightMilestones("QUOTING");
    expect(m.find((x) => x.key === "sourcing")?.status).toBe("current");
  });

  it("shipmentScriptFor returns in_transit script", () => {
    const s = shipmentScriptFor("IN_TRANSIT", "BUYER");
    expect(s?.past).toContain("transit");
  });

  it("shipmentProgressPercent increases through journey", () => {
    expect(shipmentProgressPercent("IN_TRANSIT")).toBeGreaterThan(shipmentProgressPercent("BOOKING_PENDING"));
  });

  it("commoditybidScriptFor returns approve for awaiting approval", () => {
    const s = commoditybidScriptFor("AWAITING_BUYER_APPROVAL", "BUYER");
    expect(s?.primaryAction).toBe("approve_winner");
  });
});
