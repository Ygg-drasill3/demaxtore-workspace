import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import { formatQuoteQtyWithUom, formatQuoteUom } from "./quote-uom";

export type QuotationLineItemDTO = NonNullable<QuotationRowDTO["lineItems"]>[number];

/** One priced variation inside an offer card. */
export interface OfferVariation {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceUnit?: string | null;
  packing?: string | null;
  moq?: number | null;
  lineUom?: string;
}

/** Tailwind grid classes for variation columns (responsive). */
export function variationGridClass(count: number): string {
  if (count <= 1) return "";
  const parts = ["grid gap-3 sm:gap-4", "grid-cols-1"];
  if (count === 2) {
    parts.push("md:grid-cols-2");
  } else if (count === 3) {
    parts.push("md:grid-cols-2 lg:grid-cols-3");
  } else if (count === 4) {
    parts.push("md:grid-cols-2 lg:grid-cols-4");
  } else if (count === 5) {
    parts.push("md:grid-cols-2 lg:grid-cols-5");
  } else {
    // 6+ — wrap after 4 columns with row gap (no divide-x overlap)
    parts.push("md:grid-cols-2 lg:grid-cols-4");
  }
  return parts.join(" ");
}

export function lineItemToVariation(
  li: QuotationLineItemDTO,
  lineUom?: string,
): OfferVariation {
  return {
    id: li.id,
    name: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    priceUnit: li.priceUnit ?? null,
    packing: li.packing ?? null,
    moq: li.moq ?? null,
    lineUom,
  };
}

/** Build variation list from quotation line items (sorted by position). */
export function buildVariationsFromQuotation(
  q: QuotationRowDTO,
  lineUom?: string,
  lineItemFilter?: (li: QuotationLineItemDTO) => boolean,
): OfferVariation[] {
  const items = (q.lineItems ?? [])
    .filter((li) => li.unitPrice > 0 || li.total > 0)
    .filter((li) => (lineItemFilter ? lineItemFilter(li) : true))
    .sort((a, b) => a.position - b.position);

  if (items.length === 0) {
    return [{
      id: `${q.id}-fallback`,
      name: q.supplierName,
      quantity: 1,
      unitPrice: q.unitPriceAvg ?? q.total,
      lineUom,
    }];
  }

  return items.map((li) => lineItemToVariation(li, lineUom));
}

/** Minimum unit price across variations — used for sorting and lowest-price badge. */
export function minVariationUnitPrice(variations: OfferVariation[]): number {
  if (!variations.length) return 0;
  return Math.min(...variations.map((v) => v.unitPrice));
}

/** True when any variation carries its own MOQ/POQ. */
export function hasVariationSpecificMoq(variations: OfferVariation[]): boolean {
  return variations.some((v) => v.moq != null && v.moq > 0);
}

export function variationPriceUnitLabel(v: OfferVariation): string {
  return formatQuoteUom(v.priceUnit ?? v.lineUom);
}

export function variationQtyLabel(v: OfferVariation): string {
  return formatQuoteQtyWithUom(v.quantity, v.priceUnit ?? v.lineUom);
}

export function variationMoqLabel(v: OfferVariation): string | null {
  if (v.moq == null || v.moq <= 0) return null;
  return formatQuoteQtyWithUom(v.moq, v.priceUnit ?? v.lineUom);
}

/** Compact multi-line summary for award / collapsed views. */
export function formatVariationSummary(
  variations: OfferVariation[],
  currency: string,
): { headline: string; lines: string[] } {
  if (variations.length <= 1) {
    const v = variations[0];
    if (!v) return { headline: "", lines: [] };
    return {
      headline: `${currency} ${v.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${variationPriceUnitLabel(v)}`,
      lines: [],
    };
  }
  return {
    headline: `${variations.length} variations`,
    lines: variations.map(
      (v) => `${v.name} — ${currency} ${v.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${variationPriceUnitLabel(v)}`,
    ),
  };
}
