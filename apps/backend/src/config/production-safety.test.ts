import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  nodeEnv: "development" as "development" | "test" | "production",
  paymentGates: undefined as boolean | undefined,
  incoterms: undefined as boolean | undefined,
  exceptionEngine: undefined as boolean | undefined,
  rbacExpanded: undefined as boolean | undefined,
}));

vi.mock("./env.js", () => ({
  get env() {
    return {
      NODE_ENV: h.nodeEnv,
      PAYMENT_GATES_ENABLED: h.paymentGates,
      INCOTERMS_PRECONDITIONS_ENABLED: h.incoterms,
      EXCEPTION_ENGINE_V2_ENABLED: h.exceptionEngine,
      RBAC_EXPANDED_ROLES_ENABLED: h.rbacExpanded,
    };
  },
  get isProd() {
    return h.nodeEnv === "production";
  },
}));

vi.mock("./logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), fatal: vi.fn() },
}));

describe("production safety gates (CFG-001)", () => {
  beforeEach(() => {
    h.nodeEnv = "development";
    h.paymentGates = undefined;
    h.incoterms = undefined;
    h.exceptionEngine = undefined;
    h.rbacExpanded = undefined;
    vi.resetModules();
  });

  it("reports all gates disabled in development by default", async () => {
    const { getSafetyGateStatuses } = await import("./production-safety.js");
    const gates = getSafetyGateStatuses();
    expect(gates.every((g) => !g.enabled)).toBe(true);
  });

  it("reports satisfied when all production gates enabled", async () => {
    h.nodeEnv = "production";
    h.paymentGates = true;
    h.incoterms = true;
    h.exceptionEngine = true;
    h.rbacExpanded = true;
    const { areProductionSafetyGatesSatisfied } = await import("./production-safety.js");
    expect(areProductionSafetyGatesSatisfied()).toBe(true);
  });

  it("reports unsatisfied when any production gate is missing", async () => {
    h.nodeEnv = "production";
    h.paymentGates = true;
    h.incoterms = false;
    h.exceptionEngine = true;
    h.rbacExpanded = true;
    const { areProductionSafetyGatesSatisfied, getDisabledProductionSafetyGates } =
      await import("./production-safety.js");
    expect(areProductionSafetyGatesSatisfied()).toBe(false);
    expect(getDisabledProductionSafetyGates()).toContain("INCOTERMS_PRECONDITIONS_ENABLED");
  });
});
