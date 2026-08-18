import { describe, expect, it } from "vitest";
import { NAV_BY_ROLE, NAV_GROUPS_BY_ROLE } from "./navigation";

describe("Phase 17B partner customs navigation", () => {
  it("broker sidebar points My Customs Cases at /partner/customs", () => {
    const item = NAV_BY_ROLE.CUSTOMS_BROKER.find((i) => i.testId === "nav-partner-customs");
    expect(item?.to).toBe("/partner/customs");
    expect(item?.label).toBe("My Customs Cases");
  });

  it("origin agent nav does not include customs execution routes", () => {
    const tos = NAV_BY_ROLE.ORIGIN_AGENT.map((i) => i.to);
    expect(tos).not.toContain("/partner/customs");
    expect(tos).not.toContain("/buyer/customs");
    expect(NAV_GROUPS_BY_ROLE.ORIGIN_AGENT[0]?.items.some((i) => i.label.includes("Customs"))).toBe(false);
  });

  it("trucker nav points My Deliveries at /partner/inland and does not include customs routes", () => {
    const item = NAV_BY_ROLE.TRUCKER.find((i) => i.testId === "nav-partner-deliveries");
    expect(item?.to).toBe("/partner/inland");
    expect(item?.label).toBe("My Deliveries");
    const tos = NAV_BY_ROLE.TRUCKER.map((i) => i.to);
    expect(tos).not.toContain("/partner/customs");
    expect(tos).not.toContain("/buyer/customs");
    expect(tos).not.toContain("/buyer/inland");
  });

  it("origin agent nav does not include inland execution routes", () => {
    const tos = NAV_BY_ROLE.ORIGIN_AGENT.map((i) => i.to);
    expect(tos).not.toContain("/partner/inland");
    expect(tos).not.toContain("/buyer/inland");
  });

  it("broker nav does not include inland execution routes", () => {
    const tos = NAV_BY_ROLE.CUSTOMS_BROKER.map((i) => i.to);
    expect(tos).not.toContain("/partner/inland");
    expect(tos).not.toContain("/buyer/inland");
  });
});
