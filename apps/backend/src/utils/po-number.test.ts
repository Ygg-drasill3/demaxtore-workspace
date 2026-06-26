import { describe, it, expect } from "vitest";
import { generatePoNumber } from "./po-number.js";

describe("generatePoNumber", () => {
  it("returns PO- prefix with unique suffixes", () => {
    const a = generatePoNumber();
    const b = generatePoNumber();
    expect(a).toMatch(/^PO-[A-Z0-9]+-[A-F0-9]{8}$/);
    expect(b).toMatch(/^PO-/);
    expect(a).not.toBe(b);
  });
});
