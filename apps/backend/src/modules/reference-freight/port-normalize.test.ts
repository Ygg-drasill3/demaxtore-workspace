import { describe, expect, it } from "vitest";
import {
  normalizeContainerType,
  normalizePortCode,
  resolveDestinationPortFromMarket,
} from "./port-normalize.js";

describe("port-normalize", () => {
  it("normalizes Turkish port names to codes", () => {
    expect(normalizePortCode("Mersin")).toBe("TRMER");
    expect(normalizePortCode("Izmir")).toBe("TRIZM");
    expect(normalizePortCode("Ambarlı")).toBe("TRAMB");
  });

  it("maps target markets to POD codes", () => {
    expect(resolveDestinationPortFromMarket("EU")).toBe("NLRTM");
    expect(resolveDestinationPortFromMarket("USA")).toBe("USNYC");
    expect(resolveDestinationPortFromMarket("Nigeria")).toBe("NGLOS");
  });

  it("normalizes container types", () => {
    expect(normalizeContainerType("40HC")).toBe("40HC");
    expect(normalizeContainerType("40 GP")).toBe("40GP");
    expect(normalizeContainerType("20gp")).toBe("20GP");
  });
});
