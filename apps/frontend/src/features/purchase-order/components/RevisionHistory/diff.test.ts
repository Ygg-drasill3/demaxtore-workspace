import { describe, expect, it } from "vitest";
import {
  diffRevisionSnapshots,
  isCurrentRevision,
  revisionLineMatchKey,
} from "./diff";

describe("revisionLineMatchKey", () => {
  it("prefers sku then description then position", () => {
    expect(revisionLineMatchKey({ sku: "A1", description: "x" }, 0)).toBe("sku:a1");
    expect(revisionLineMatchKey({ productCode: "B2" }, 1)).toBe("sku:b2");
    expect(revisionLineMatchKey({ description: "Wheat" }, 2)).toBe("desc:wheat");
    expect(revisionLineMatchKey({}, 4)).toBe("pos:4");
  });
});

describe("isCurrentRevision", () => {
  it("uses highest revisionNumber", () => {
    const revs = [{ revisionNumber: 1 }, { revisionNumber: 2 }];
    expect(isCurrentRevision(2, revs)).toBe(true);
    expect(isCurrentRevision(1, revs)).toBe(false);
  });
});

describe("diffRevisionSnapshots", () => {
  it("detects header and line changes", () => {
    const before = {
      header: { currency: "USD", paymentTerms: "Net 30", notes: "A" },
      lines: [
        { sku: "S1", description: "Flour", quantity: 10, unitPrice: 2, lineTotal: 20 },
        { sku: "S2", description: "Oil", quantity: 5, unitPrice: 4, lineTotal: 20 },
      ],
    };
    const after = {
      header: { currency: "USD", paymentTerms: "Net 45", notes: "B" },
      lines: [
        { sku: "S1", description: "Flour", quantity: 12, unitPrice: 2, lineTotal: 24 },
        { sku: "S3", description: "Pasta", quantity: 1, unitPrice: 9, lineTotal: 9 },
      ],
    };
    const diff = diffRevisionSnapshots(before, after);
    expect(diff.header.some((h) => h.field === "paymentTerms")).toBe(true);
    expect(diff.header.some((h) => h.field === "notes")).toBe(true);
    expect(diff.lines.some((l) => l.kind === "changed" && l.changes.some((c) => c.field === "quantity"))).toBe(true);
    expect(diff.lines.some((l) => l.kind === "removed")).toBe(true);
    expect(diff.lines.some((l) => l.kind === "added")).toBe(true);
  });

  it("matches Direct structured packaging/spec changes", () => {
    const before = {
      header: {
        currency: "EUR",
        directLines: [{ productName: "Bulgur", packaging: "10kg", specification: "Fine", quantity: 1, unitPrice: 3 }],
      },
      lines: [],
    };
    const after = {
      header: {
        currency: "EUR",
        directLines: [{ productName: "Bulgur", packaging: "25kg", specification: "Coarse", quantity: 1, unitPrice: 3 }],
      },
      lines: [],
    };
    const diff = diffRevisionSnapshots(before, after);
    const changed = diff.lines.find((l) => l.kind === "changed");
    expect(changed?.changes.some((c) => c.field === "packaging")).toBe(true);
    expect(changed?.changes.some((c) => c.field === "specification")).toBe(true);
  });
});
