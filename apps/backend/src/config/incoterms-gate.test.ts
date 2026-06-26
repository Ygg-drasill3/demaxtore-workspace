import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertIncotermDocuments,
  getOrderIncotermProfile,
  isIncotermsPreconditionsEnabled,
} from "./incoterms-gate.js";
import { INCOTERM_PROFILES } from "@dmx/contracts/incoterms";

vi.mock("./env.js", () => ({
  env: { INCOTERMS_PRECONDITIONS_ENABLED: false },
}));

describe("incoterms-gate", () => {
  it("isIncotermsPreconditionsEnabled false by default", () => {
    expect(isIncotermsPreconditionsEnabled()).toBe(false);
  });

  it("assertIncotermDocuments returns empty when flag off", () => {
    const missing = assertIncotermDocuments(INCOTERM_PROFILES.FOB, []);
    expect(missing).toEqual([]);
  });

  it("assertIncotermDocuments lists missing docs when flag on", async () => {
    const { env } = await import("./env.js");
    (env as { INCOTERMS_PRECONDITIONS_ENABLED: boolean }).INCOTERMS_PRECONDITIONS_ENABLED = true;
    const missing = assertIncotermDocuments(INCOTERM_PROFILES.CIF, ["COMMERCIAL_INVOICE"]);
    expect(missing).toContain("INSURANCE_CERTIFICATE");
    (env as { INCOTERMS_PRECONDITIONS_ENABLED: boolean }).INCOTERMS_PRECONDITIONS_ENABLED = false;
  });

  it("getOrderIncotermProfile defaults null to FOB", async () => {
    const db = {
      orderWorkspace: {
        findUnique: vi.fn().mockResolvedValue({ incoterms: null }),
      },
    };
    const profile = await getOrderIncotermProfile(db as never, "order-1");
    expect(profile.code).toBe("FOB");
  });
});
