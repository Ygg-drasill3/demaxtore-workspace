import { describe, expect, it } from "vitest";
import { computeReferenceFreightLifecycleStatus } from "./reference-freight.js";

describe("computeReferenceFreightLifecycleStatus", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("returns INACTIVE when record status is inactive", () => {
    expect(
      computeReferenceFreightLifecycleStatus(
        "INACTIVE",
        "2026-07-01T00:00:00.000Z",
        "2026-07-31T23:59:59.999Z",
        now,
      ),
    ).toBe("INACTIVE");
  });

  it("returns EXPIRED after validUntil", () => {
    expect(
      computeReferenceFreightLifecycleStatus(
        "ACTIVE",
        "2026-06-01T00:00:00.000Z",
        "2026-06-30T23:59:59.999Z",
        now,
      ),
    ).toBe("EXPIRED");
  });

  it("returns EXPIRING_SOON within 7 days of validUntil", () => {
    expect(
      computeReferenceFreightLifecycleStatus(
        "ACTIVE",
        "2026-07-01T00:00:00.000Z",
        "2026-07-20T23:59:59.999Z",
        now,
      ),
    ).toBe("EXPIRING_SOON");
  });

  it("returns ACTIVE when comfortably inside validity window", () => {
    expect(
      computeReferenceFreightLifecycleStatus(
        "ACTIVE",
        "2026-07-01T00:00:00.000Z",
        "2026-08-31T23:59:59.999Z",
        now,
      ),
    ).toBe("ACTIVE");
  });
});
