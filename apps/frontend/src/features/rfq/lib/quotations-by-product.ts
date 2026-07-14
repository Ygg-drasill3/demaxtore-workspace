import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

export interface RfqLineRef {
  id: string;
  position: number;
  description: string;
  uom?: string;
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
        const linked =
          li.rfqLineItemId === line.id ||
          (!li.rfqLineItemId &&
            li.description.trim().toLowerCase() === line.description.trim().toLowerCase());
        if (!linked) continue;
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

/** Count distinct quotations that have at least one priced line. */
export function countPricedQuotations(quotations: QuotationRowDTO[]): number {
  return quotations.filter((q) =>
    (q.lineItems ?? []).some((li) => li.unitPrice > 0 || li.total > 0),
  ).length;
}
