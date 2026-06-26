import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

function unwrapQuotationRows(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw != null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.quotations)) return obj.quotations;
    if (Array.isArray(obj.data)) return obj.data;
    return [raw];
  }
  return [];
}

/** API list must be an array of comparison rows — never a single object. */
export function normalizeQuotationList(raw: unknown): QuotationRowDTO[] {
  return unwrapQuotationRows(raw)
    .map((row) => normalizeQuotationRow(row as Record<string, unknown>))
    .filter((row): row is QuotationRowDTO => row != null);
}

function normalizeQuotationRow(q: Record<string, unknown>): QuotationRowDTO | null {
  const id = q.id != null ? String(q.id) : "";
  const supplierId = String(q.supplierId ?? q.supplierUserId ?? "");
  if (!id || !supplierId || supplierId === "undefined") return null;

  const lineItems = Array.isArray(q.lineItems) ? q.lineItems : [];
  let unitPriceAvg =
    typeof q.unitPriceAvg === "number" ? q.unitPriceAvg : null;

  if (unitPriceAvg == null && lineItems.length > 0) {
    let qty = 0;
    let val = 0;
    for (const li of lineItems) {
      const row = li as Record<string, unknown>;
      const lq = Number(row.quantity);
      const up = Number(row.unitPrice);
      if (Number.isFinite(lq) && Number.isFinite(up)) {
        qty += lq;
        val += lq * up;
      }
    }
    if (qty > 0) unitPriceAvg = val / qty;
  }

  const status =
    q.status === "WITHDRAWN" || q.status === "REVISED" || q.status === "SUBMITTED"
      ? q.status
      : q.withdrawnAt
        ? "WITHDRAWN"
        : "SUBMITTED";

  const total = Number(q.total);
  if (!Number.isFinite(total)) return null;

  const normalizedLineItems = lineItems.length
    ? lineItems.map((li) => {
        const row = li as Record<string, unknown>;
        return {
          id:          String(row.id ?? ""),
          position:    Number(row.position),
          description: String(row.description ?? ""),
          quantity:    Number(row.quantity),
          unitPrice:   Number(row.unitPrice),
          total:       Number(row.total ?? Number(row.quantity) * Number(row.unitPrice)),
        };
      })
    : undefined;

  return {
    id,
    supplierId,
    supplierName: String(q.supplierName ?? q.supplierOrg ?? "Supplier"),
    total,
    currency:     String(q.currency ?? "USD"),
    unitPriceAvg,
    leadTimeDays: q.leadTimeDays != null ? Number(q.leadTimeDays) : null,
    moq:          q.moq != null ? Number(q.moq) : null,
    incoterm:     (q.incoterm as string | null) ?? null,
    paymentTerms: (q.paymentTerms as string | null) ?? null,
    sampleAvail:  q.sampleAvail == null ? null : Boolean(q.sampleAvail),
    validUntil:   (q.validUntil as string | null) ?? null,
    status,
    submittedAt:  String(q.submittedAt ?? new Date().toISOString()),
    ...(normalizedLineItems ? { lineItems: normalizedLineItems } : {}),
  };
}

/** Buyer/admin panels: one active bid column per supplier (never collapse to a single global row). */
export function activeQuotations(rows: QuotationRowDTO[]): QuotationRowDTO[] {
  const active = rows.filter((q) => q.status !== "WITHDRAWN");
  const bySupplier = new Map<string, QuotationRowDTO>();

  for (const q of active) {
    const prev = bySupplier.get(q.supplierId);
    if (!prev || new Date(q.submittedAt).getTime() > new Date(prev.submittedAt).getTime()) {
      bySupplier.set(q.supplierId, q);
    }
  }

  return Array.from(bySupplier.values()).sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
}
