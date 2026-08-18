import { describe, it, expect } from "vitest";
import {
  buildVariationsFromQuotation,
  hasVariationSpecificMoq,
  minVariationUnitPrice,
  variationGridClass,
} from "../offer-variations";
import { buildOfferQuotationRows, distinctOfferRows, filterRfqLinesForScope } from "../quotations-by-product";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

function makeQuote(
  id: string,
  supplierName: string,
  lineItems: NonNullable<QuotationRowDTO["lineItems"]>,
): QuotationRowDTO {
  return {
    id,
    supplierId: `sup-${id}`,
    supplierName,
    total: lineItems.reduce((s, li) => s + li.total, 0),
    currency: "USD",
    unitPriceAvg: null,
    leadTimeDays: 30,
    moq: 100,
    incoterm: "FOB",
    paymentTerms: null,
    sampleAvail: true,
    validUntil: null,
    status: "SUBMITTED",
    submittedAt: "2026-07-03T00:00:00.000Z",
    lineItems,
  };
}

const oliveOilVariations = [
  {
    id: "li-500",
    position: 1,
    description: "500 ml Glass Bottle",
    quantity: 1,
    unitPrice: 2.10,
    total: 2.10,
    priceUnit: "Piece",
    packing: "12 Bottles / Carton",
  },
  {
    id: "li-1l",
    position: 2,
    description: "1 L Glass Bottle",
    quantity: 1,
    unitPrice: 3.85,
    total: 3.85,
    priceUnit: "Piece",
    packing: "6 Bottles / Carton",
  },
  {
    id: "li-10l",
    position: 3,
    description: "10 L Tin",
    quantity: 500,
    unitPrice: 31.00,
    total: 15500,
    priceUnit: "Piece",
  },
] satisfies NonNullable<QuotationRowDTO["lineItems"]>;

describe("offer-variations", () => {
  it("builds sorted variations from quotation line items", () => {
    const q = makeQuote("q1", "fatih gıda", oliveOilVariations);
    const vars = buildVariationsFromQuotation(q, "Container");
    expect(vars).toHaveLength(3);
    expect(vars[0]!.name).toBe("500 ml Glass Bottle");
    expect(vars[0]!.packing).toBe("12 Bottles / Carton");
  });

  it("uses minimum unit price for sorting", () => {
    const q = makeQuote("q1", "fatih gıda", oliveOilVariations);
    const vars = buildVariationsFromQuotation(q);
    expect(minVariationUnitPrice(vars)).toBe(2.10);
  });

  it("returns responsive grid classes for 2–6 variations", () => {
    expect(variationGridClass(2)).toContain("md:grid-cols-2");
    expect(variationGridClass(3)).toContain("lg:grid-cols-3");
    expect(variationGridClass(4)).toContain("lg:grid-cols-4");
    expect(variationGridClass(5)).toContain("lg:grid-cols-5");
    expect(variationGridClass(6)).toContain("lg:grid-cols-4");
    expect(variationGridClass(6)).toContain("gap-3");
    expect(variationGridClass(6)).not.toContain("divide-x");
  });

  it("detects variation-specific MOQ", () => {
    const withMoq = buildVariationsFromQuotation(
      makeQuote("q1", "A", [{ ...oliveOilVariations[0]!, moq: 50 }]),
    );
    expect(hasVariationSpecificMoq(withMoq)).toBe(true);
    expect(hasVariationSpecificMoq(buildVariationsFromQuotation(makeQuote("q1", "A", [oliveOilVariations[0]!])))).toBe(false);
  });
});

describe("buildOfferQuotationRows", () => {
  const rfqLines = [{ id: "line-oil", position: 1, description: "Extra Virgin Olive Oil", uom: "Container" }];

  it("filters RFQ lines to supplier scope", () => {
    const lines = [
      { id: "line-pasta", position: 1, description: "Pasta", uom: "Piece" },
      { id: "line-flour", position: 2, description: "Wheat Flour", uom: "Piece" },
    ];
    expect(filterRfqLinesForScope(lines, ["line-pasta"])).toEqual([lines[0]]);
    expect(filterRfqLinesForScope(lines, null)).toEqual(lines);
  });

  it("creates one offer row per quotation with offer-level key", () => {
    const rows = buildOfferQuotationRows([makeQuote("q1", "fatih gıda", oliveOilVariations)], rfqLines);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("q1");
    expect(rows[0]!.variations).toHaveLength(3);
  });

  it("handles single-variation offers", () => {
    const rows = buildOfferQuotationRows([
      makeQuote("q-pasta", "Supplier A", [{
        id: "li-pasta",
        position: 1,
        description: "Pasta",
        quantity: 1,
        unitPrice: 33,
        total: 33,
        priceUnit: "Piece",
      }]),
    ], [{ id: "l1", position: 1, description: "Pasta", uom: "Piece" }]);
    expect(rows[0]!.variations).toHaveLength(1);
    expect(rows[0]!.unitPrice).toBe(33);
  });

  it("dedupes multi-product section rows for stats", () => {
    const q = makeQuote("q1", "Supplier A", oliveOilVariations);
    const rows = [
      ...buildOfferQuotationRows([q], [{ id: "l1", position: 1, description: "Oil A", uom: "Piece" }]),
      ...buildOfferQuotationRows([q], [{ id: "l2", position: 2, description: "Oil B", uom: "Piece" }]),
    ];
    expect(rows).toHaveLength(2);
    expect(distinctOfferRows(rows)).toHaveLength(1);
  });
});
