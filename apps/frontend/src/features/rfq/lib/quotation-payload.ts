import { ZodError } from "zod";
import {
  INCOTERM_VALUES,
  SubmitQuotationPayload,
  type SubmitQuotationPayload as Payload,
} from "@dmx/contracts/rfq.zod";

const CURRENCIES = ["USD", "EUR", "GBP"] as const;
const INCOTERMS = INCOTERM_VALUES;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface QuoteFormLine {
  rfqLineItemId?: string;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  /** Display/submit unit label — mapped to API priceUnit. */
  uom?: string;
  packing?: string;
  moq?: string;
}

export interface QuoteFormFields {
  currency: string;
  leadTimeDays: string;
  moq: string;
  paymentTerms: string;
  incoterm: string;
  sampleAvail: "" | "yes" | "no";
  validUntil: string;
  notes: string;
  lines: QuoteFormLine[];
}

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

function positiveInt(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = Math.round(parseNum(s));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function normalizeCurrency(c: string): (typeof CURRENCIES)[number] {
  const u = (c || "USD").trim().toUpperCase();
  return (CURRENCIES as readonly string[]).includes(u) ? (u as (typeof CURRENCIES)[number]) : "USD";
}

/** Build API body matching SubmitQuotationPayload — strips invalid optional fields. */
export function buildSubmitQuotationPayload(form: QuoteFormFields): Payload {
  const pricedLines = form.lines.filter((l) => l.unitPrice.trim() !== "");
  const lineItems = pricedLines.map((l, i) => {
    const row: Payload["lineItems"][number] = {
      position:    Number.isFinite(l.position) && l.position > 0 ? Math.trunc(l.position) : i + 1,
      description: l.description.trim(),
      quantity:    parseNum(l.quantity),
      unitPrice:   parseNum(l.unitPrice),
    };
    if (l.rfqLineItemId && UUID_RE.test(l.rfqLineItemId)) {
      row.rfqLineItemId = l.rfqLineItemId;
    }
    if (l.uom?.trim()) {
      row.priceUnit = l.uom.trim();
    }
    if (l.packing?.trim()) {
      row.packing = l.packing.trim();
    }
    const lineMoq = positiveInt(l.moq ?? "");
    if (lineMoq) {
      row.moq = lineMoq;
    }
    return row;
  });

  const inc =
    form.incoterm && (INCOTERMS as readonly string[]).includes(form.incoterm)
      ? (form.incoterm as (typeof INCOTERMS)[number])
      : undefined;

  let validUntil: string | undefined;
  if (form.validUntil.trim()) {
    validUntil = new Date(`${form.validUntil.trim()}T23:59:59.000Z`).toISOString();
  }

  const raw = {
    currency:     normalizeCurrency(form.currency),
    lineItems,
    leadTimeDays: positiveInt(form.leadTimeDays),
    moq:          positiveInt(form.moq),
    paymentTerms: form.paymentTerms.trim() || undefined,
    incoterm:     inc,
    sampleAvail:
      form.sampleAvail === "yes" ? true : form.sampleAvail === "no" ? false : undefined,
    validUntil,
    notes: form.notes.trim() || undefined,
  };

  return SubmitQuotationPayload.parse(raw);
}

export function formatQuotationValidationError(err: unknown): string {
  if (err instanceof ZodError && err.issues[0]) {
    const first = err.issues[0];
    const path = first.path.length ? first.path.join(".") : "form";
    return `${path}: ${first.message}`;
  }
  return "Check line items, prices, and optional fields (lead time = whole days, PDF not required here)";
}

export function formatApiValidationError(e: unknown): string {
  const details = (e as { response?: { data?: { error?: { details?: { issues?: Array<{ path: (string | number)[]; message: string }> } } } } })
    ?.response?.data?.error?.details?.issues;
  if (details?.length) {
    const i = details[0];
    const path = i.path?.length ? i.path.join(".") : "field";
    return `${path}: ${i.message}`;
  }
  return (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
    ?? "Submit failed";
}
