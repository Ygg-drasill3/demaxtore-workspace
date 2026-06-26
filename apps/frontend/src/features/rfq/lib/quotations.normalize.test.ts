import { describe, it, expect } from "vitest";
import { activeQuotations, normalizeQuotationList } from "./quotations.normalize";

const base = (overrides: Partial<{
  id: string;
  supplierId: string;
  supplierName: string;
  total: number;
  submittedAt: string;
  status: "SUBMITTED" | "REVISED" | "WITHDRAWN";
}>) => ({
  id: "q1",
  supplierId: "s1",
  supplierName: "Acme",
  total: 1000,
  currency: "USD",
  unitPriceAvg: 10,
  leadTimeDays: 14,
  moq: null,
  incoterm: "FOB",
  paymentTerms: null,
  sampleAvail: null,
  validUntil: null,
  status: "SUBMITTED" as const,
  submittedAt: "2026-06-01T10:00:00.000Z",
  ...overrides,
});

describe("normalizeQuotationList", () => {
  it("unwraps items envelope", () => {
    const rows = normalizeQuotationList({
      items: [base({ id: "q1", supplierId: "s1" }), base({ id: "q2", supplierId: "s2", supplierName: "Beta" })],
    });
    expect(rows).toHaveLength(2);
    expect(rows[1]?.supplierName).toBe("Beta");
  });

  it("returns all valid supplier rows from a plain array", () => {
    const rows = normalizeQuotationList([
      base({ id: "q1", supplierId: "s1" }),
      base({ id: "q2", supplierId: "s2", supplierName: "Beta", total: 900 }),
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("activeQuotations", () => {
  it("keeps one active row per supplier", () => {
    const rows = activeQuotations([
      base({ id: "q1a", supplierId: "s1", submittedAt: "2026-06-01T10:00:00.000Z", total: 1100 }),
      base({ id: "q1b", supplierId: "s1", submittedAt: "2026-06-02T10:00:00.000Z", total: 1000 }),
      base({ id: "q2", supplierId: "s2", supplierName: "Beta", total: 950 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.supplierId === "s1")?.total).toBe(1000);
    expect(rows.find((r) => r.supplierId === "s2")?.total).toBe(950);
  });

  it("does not collapse multiple suppliers into a single latest row", () => {
    const rows = activeQuotations([
      base({ id: "q1", supplierId: "s1", submittedAt: "2026-06-01T10:00:00.000Z" }),
      base({ id: "q2", supplierId: "s2", supplierName: "Beta", submittedAt: "2026-06-03T10:00:00.000Z" }),
    ]);
    expect(rows).toHaveLength(2);
  });
});
