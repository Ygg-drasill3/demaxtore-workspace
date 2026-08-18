import { describe, expect, it } from "vitest";
import { shipmentKeys } from "../lib/shipment.query-keys";
import { shipmentBadgeGroup } from "@dmx/contracts/shipment-workspace";

describe("shipmentKeys", () => {
  it("builds stable cache keys", () => {
    expect(shipmentKeys.detail("abc")).toEqual(["shipment", "abc"]);
    expect(shipmentKeys.timeline("abc")).toEqual(["shipment", "abc", "timeline"]);
    expect(shipmentKeys.containers("abc")).toEqual(["shipment", "abc", "containers"]);
  });
});

describe("shipment workspace badge mapping (UI)", () => {
  it("maps transit states for badge styling", () => {
    expect(shipmentBadgeGroup("IN_TRANSIT")).toBe("TRANSIT");
    expect(shipmentBadgeGroup("DELIVERED")).toBe("DELIVERED");
  });
});
