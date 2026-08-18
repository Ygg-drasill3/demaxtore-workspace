import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import {
  buildVariationsFromQuotation,
  minVariationUnitPrice,
  type OfferVariation,
} from "./offer-variations";

export interface RfqLineRef {
  id: string;
  position: number;
  description: string;
  uom?: string;
  awardStatus?: "OPEN" | "AWARDED" | "NO_AWARD" | "CANCELLED";
  award?: {
    quotationId: string;
    supplierUserId: string;
    supplierName?: string;
    awardedAt: string;
    rationale?: string | null;
    poIssued?: boolean;
    orderWorkspaceId?: string | null;
  } | null;
}

export interface ProductBid {
  quotation: QuotationRowDTO;
  lineItem: NonNullable<QuotationRowDTO["lineItems"]>[number];
  lineTotal: number;
}

export interface ProductQuoteGroup {
  line: RfqLineRef;
  bids: ProductBid[];
  lowestTotal: number | null;
}

/** Short label for product section headings (first sentence or line). */
export function productSectionTitle(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "Product";
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  const sentence = firstLine.split(/\.\s/)[0]?.trim() ?? firstLine;
  return sentence.length > 72 ? `${sentence.slice(0, 69)}…` : sentence;
}

export interface ProductQuotationRow {
  quotation: QuotationRowDTO;
  /** Offer-level key — always quotation.id */
  key: string;
  unitPrice: number;
  total: number;
  lineUom?: string;
  productTitle: string;
  /** @deprecated use variations[0] — kept for single-variation compat */
  lineDescription: string;
  /** @deprecated use variations[0] — kept for single-variation compat */
  lineQuantity: number;
  variations: OfferVariation[];
}

export interface ProductQuotationSection {
  line: RfqLineRef;
  productTitle: string;
  rows: ProductQuotationRow[];
  lowestUnit: number | null;
}

function lineMatchesRfqProduct(
  line: RfqLineRef,
  li: NonNullable<QuotationRowDTO["lineItems"]>[number],
): boolean {
  if (li.rfqLineItemId === line.id) return true;
  if (li.rfqLineItemId) return false;
  const base = line.description.trim().toLowerCase();
  const desc = li.description.trim().toLowerCase();
  if (!base || !desc) return false;
  return (
    desc === base
    || desc.startsWith(`${base} `)
    || desc.startsWith(`${base}—`)
    || desc.startsWith(`${base} -`)
  );
}

/**
 * Group submitted quotations under RFQ product lines.
 * Returns null when RFQ has a single line — caller keeps supplier-centric grid.
 */
export function groupQuotationsByProduct(
  rfqLines: RfqLineRef[],
  quotations: QuotationRowDTO[],
): ProductQuoteGroup[] | null {
  if (rfqLines.length <= 1) return null;

  return rfqLines.map((line) => {
    const bids: ProductBid[] = [];

    for (const q of quotations) {
      for (const li of q.lineItems ?? []) {
        if (!lineMatchesRfqProduct(line, li)) continue;
        if (li.unitPrice <= 0 && li.total <= 0) continue;
        bids.push({ quotation: q, lineItem: li, lineTotal: li.total });
      }
    }

    bids.sort((a, b) => a.lineTotal - b.lineTotal || a.quotation.submittedAt.localeCompare(b.quotation.submittedAt));

    const totals = bids.map((b) => b.lineTotal);
    const lowestTotal = totals.length ? Math.min(...totals) : null;

    return { line, bids, lowestTotal };
  });
}

function buildOfferRow(
  q: QuotationRowDTO,
  productTitle: string,
  lineUom?: string,
  lineItemFilter?: (li: NonNullable<QuotationRowDTO["lineItems"]>[number]) => boolean,
): ProductQuotationRow {
  const variations = buildVariationsFromQuotation(q, lineUom, lineItemFilter);
  const primary = variations[0]!;
  return {
    quotation: q,
    key: q.id,
    unitPrice: minVariationUnitPrice(variations),
    total: q.total,
    lineUom,
    productTitle,
    lineDescription: primary.name,
    lineQuantity: primary.quantity,
    variations,
  };
}

export function filterRfqLinesForScope(
  lines: RfqLineRef[],
  allowedQuoteLineItemIds?: string[] | null,
): RfqLineRef[] {
  if (!allowedQuoteLineItemIds?.length) return lines;
  const allowed = new Set(allowedQuoteLineItemIds);
  return lines.filter((li) => allowed.has(li.id));
}

/** Buyer comparison sections — one block per RFQ product line. */
export function buildProductQuotationSections(
  rfqLines: RfqLineRef[],
  quotations: QuotationRowDTO[],
): ProductQuotationSection[] | null {
  const groups = groupQuotationsByProduct(rfqLines, quotations);
  if (!groups) return null;

  return groups.map((g) => {
    const byQuotation = new Map<string, QuotationRowDTO>();
    for (const b of g.bids) {
      byQuotation.set(b.quotation.id, b.quotation);
    }

    const rows: ProductQuotationRow[] = [...byQuotation.values()]
      .map((q) =>
        buildOfferRow(
          q,
          productSectionTitle(g.line.description),
          g.line.uom,
          (li) => lineMatchesRfqProduct(g.line, li),
        ),
      )
      .sort((a, b) => a.unitPrice - b.unitPrice);

    const unitPrices = rows.map((r) => r.unitPrice);
    return {
      line: g.line,
      productTitle: productSectionTitle(g.line.description),
      rows,
      lowestUnit: unitPrices.length ? Math.min(...unitPrices) : null,
    };
  });
}

/** Build offer-level rows for single-product RFQs. */
export function buildOfferQuotationRows(
  quotations: QuotationRowDTO[],
  rfqLineItems: RfqLineRef[],
): ProductQuotationRow[] {
  const productTitle = productSectionTitle(rfqLineItems[0]?.description ?? "");
  const lineUom = rfqLineItems[0]?.uom;

  return quotations
    .map((q) => buildOfferRow(q, productTitle, lineUom))
    .sort((a, b) => a.unitPrice - b.unitPrice);
}

/** Distinct offer rows for sidebar stats (one per quotation.id). */
export function distinctOfferRows(rows: ProductQuotationRow[]): ProductQuotationRow[] {
  const byKey = new Map<string, ProductQuotationRow>();
  for (const r of rows) {
    const prev = byKey.get(r.key);
    if (!prev || r.unitPrice < prev.unitPrice) byKey.set(r.key, r);
  }
  return [...byKey.values()].sort((a, b) => a.unitPrice - b.unitPrice);
}

/** Count distinct quotations that have at least one priced line. */
export function countPricedQuotations(quotations: QuotationRowDTO[]): number {
  return quotations.filter((q) =>
    (q.lineItems ?? []).some((li) => li.unitPrice > 0 || li.total > 0),
  ).length;
}
