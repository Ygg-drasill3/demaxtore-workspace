import { formatQuoteUom } from "@/features/rfq/lib/quote-uom";

export function emptyValue(value: string | number | null | undefined): string {
  if (value == null) return "Not specified";
  if (typeof value === "string" && value.trim() === "") return "Not specified";
  return String(value);
}

export function formatPoDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not specified";
  return d.toLocaleDateString(locale || undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Short table date — e.g. 27 Tem 2026 for tr-TR. */
export function formatPoDateShort(iso: string | null | undefined, locale = "tr-TR"): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not specified";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatListTotal(
  totalAmount: number | null | undefined,
  currency: string,
  pricingState?: "COMPLETE" | "PARTIAL" | "UNPRICED" | null,
  locale = "tr-TR",
): string {
  if (pricingState === "PARTIAL") return "Partial pricing";
  if (pricingState === "UNPRICED" || totalAmount == null) return "Not specified";
  return formatPoMoney(totalAmount, currency, locale);
}

export function formatPoMoney(
  value: number | string | null | undefined,
  currency: string,
  locale?: string,
): string {
  if (value == null || value === "") return "Not specified";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "Not specified";
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

/** Preserve meaningful decimals — do not force 2 places. */
export function formatPoQuantity(value: number | string | null | undefined): string {
  if (value == null || value === "") return "Not specified";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "Not specified";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(n);
}

export function formatPoUnit(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Not specified";
  return formatQuoteUom(raw);
}

export type PricingSummary =
  | { kind: "full"; subtotal: number }
  | { kind: "none" }
  | { kind: "partial" };

export function summarizeLinePricing(
  lines: Array<{ unitPrice?: number | null; lineTotal?: number | null; quantity?: number | null }>,
): PricingSummary {
  if (lines.length === 0) return { kind: "none" };
  let priced = 0;
  let unpriced = 0;
  let subtotal = 0;
  for (const line of lines) {
    const price = line.unitPrice;
    if (price == null || !Number.isFinite(Number(price))) {
      unpriced += 1;
      continue;
    }
    // Explicit zero is priced; treat as specified.
    priced += 1;
    const total = line.lineTotal != null && Number.isFinite(Number(line.lineTotal))
      ? Number(line.lineTotal)
      : Number(price) * Number(line.quantity ?? 0);
    subtotal += total;
  }
  if (priced === 0) return { kind: "none" };
  if (unpriced > 0) return { kind: "partial" };
  return { kind: "full", subtotal };
}
