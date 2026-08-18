// apps/frontend/src/features/rfq/components/SupplierQuoteForm.tsx
//
// Sprint 2.8 — supplier-facing quotation form.
//
// Mounts inside the workspace page only when:
//   • workspace state === "RFQ_OPEN"
//   • current user has role SUPPLIER AND is a participant
//
// Three modes:
//   • "compose"  — no existing quotation → submit a fresh one
//   • "review"   — existing SUBMITTED/REVISED quotation → revise or withdraw
//   • "withdrawn"— last action was withdraw → can re-submit (calls POST)
//
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FilePen, FilePlus, AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { toast } from "@/store/toast.store";
import { useAuth } from "@/store/auth.store";
import { normalizeQuotationList } from "../lib/quotations.normalize";
import { INCOTERM_VALUES } from "@dmx/contracts/rfq.zod";
import {
  buildSubmitQuotationPayload,
  formatApiValidationError,
  formatQuotationValidationError,
} from "../lib/quotation-payload";

const INCOTERMS = INCOTERM_VALUES;

const QUOTE_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
] as const;

type QuoteCurrency = (typeof QUOTE_CURRENCY_OPTIONS)[number]["value"];

function normalizeQuoteCurrency(c: string | undefined): QuoteCurrency {
  const u = (c ?? "USD").trim().toUpperCase();
  return u === "EUR" ? "EUR" : "USD";
}

const QUOTE_UOM_OPTIONS = [
  { value: "piece", label: "Piece" },
  { value: "carton", label: "Carton" },
  { value: "ton", label: "Ton" },
] as const;

const LINE_GRID =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_80px_96px_112px_104px_40px] sm:items-center sm:gap-3";

const fieldSelectClass =
  "h-10 w-full rounded-lg border border-paper-200 bg-white px-3 text-sm text-ink-900 focus:border-accent-900 focus:outline-none focus:ring-2 focus:ring-accent-900/15";

const lineInputClass =
  "h-10 w-full rounded-lg border border-paper-200 bg-white px-3 text-sm text-ink-900 tabular-nums focus:border-accent-900 focus:outline-none focus:ring-2 focus:ring-accent-900/15";

function CurrencySelect({
  value,
  onChange,
  testId,
  compact,
}: {
  value: QuoteCurrency;
  onChange: (c: QuoteCurrency) => void;
  testId: string;
  compact?: boolean;
}) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value as QuoteCurrency)}
      className={
        compact
          ? "h-8 rounded-lg border border-paper-200 bg-white px-2.5 text-xs font-semibold text-ink-900"
          : fieldSelectClass
      }
      aria-label="Quotation currency"
    >
      {QUOTE_CURRENCY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function normalizeQuoteUom(uom: string | undefined): (typeof QUOTE_UOM_OPTIONS)[number]["value"] {
  const u = (uom ?? "").trim().toLowerCase();
  if (u === "ton" || u === "t") return "ton";
  if (u === "carton" || u === "ctn" || u === "karton") return "carton";
  return "piece";
}

interface LineRow {
  clientLineId: string;
  rfqLineItemId?: string;
  position:     number;
  description:  string;
  quantity:     string;
  uom:          string;
  unitPrice:    string;
}

function newClientLineId(): string {
  return `cline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function blankLineFromRfq(
  li: { id: string; position: number; description: string; quantity: number; uom: string },
  overrides?: Partial<LineRow>,
): LineRow {
  return {
    clientLineId: newClientLineId(),
    rfqLineItemId: li.id,
    position: li.position,
    description: li.description,
    quantity: String(li.quantity),
    uom: normalizeQuoteUom(li.uom),
    unitPrice: "",
    ...overrides,
  };
}

function blankCustomLine(position: number): LineRow {
  return {
    clientLineId: newClientLineId(),
    position,
    description: "",
    quantity: "1",
    uom: "piece",
    unitPrice: "",
  };
}

function mergeQuotedAndAvailableLines(
  quoted: LineRow[],
  quotable: Array<{ id: string; position: number; description: string; quantity: number; uom: string }>,
): LineRow[] {
  const quotedIds = new Set(quoted.map((l) => l.rfqLineItemId).filter(Boolean));
  const extra = quotable.filter((li) => !quotedIds.has(li.id)).map((li) => blankLineFromRfq(li));
  return [
    ...quoted.map((l) => ({ ...l, clientLineId: l.clientLineId ?? newClientLineId() })),
    ...extra,
  ];
}

interface Props {
  workspaceId: string;
  rfqLineItems: Array<{ id: string; position: number; description: string; quantity: number; uom: string }>;
  /** null/undefined = all lines; array = restricted product scope. */
  allowedQuoteLineItemIds?: string[] | null;
  currency:     string;
  /** Buyer RFQ incoterm — pre-fills supplier quote when set. */
  defaultIncoterm?: string;
  /** Admin submits or revises on behalf of this supplier user id. */
  onBehalfOfSupplierId?: string;
  /** When set, submit merges new lines into this existing quotation (partial product quote). */
  appendToQuotationId?: string;
  /** Supplier display name for admin-mode headings. */
  onBehalfOfSupplierName?: string;
  /** Render without outer card chrome (nested inside admin panel). */
  embedded?: boolean;
}

const num = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export function SupplierQuoteForm({
  workspaceId,
  rfqLineItems,
  allowedQuoteLineItemIds,
  currency,
  defaultIncoterm,
  onBehalfOfSupplierId,
  onBehalfOfSupplierName,
  appendToQuotationId,
  embedded,
}: Props) {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  const effectiveSupplierId = onBehalfOfSupplierId ?? userId;
  const adminMode = !!onBehalfOfSupplierId;

  const quotableLineItems = useMemo(() => {
    if (!allowedQuoteLineItemIds?.length) return rfqLineItems;
    const allowed = new Set(allowedQuoteLineItemIds);
    return rfqLineItems.filter((li) => allowed.has(li.id));
  }, [rfqLineItems, allowedQuoteLineItemIds]);

  const myQuotation = useQuery({
    queryKey: ["rfq", workspaceId, "quotations", "mine", effectiveSupplierId],
    queryFn: async () => {
      const r = await api.get(`/rfq/${workspaceId}/quotations`);
      const rows = normalizeQuotationList(r.data);
      return effectiveSupplierId ? rows.filter((q) => q.supplierId === effectiveSupplierId) : rows;
    },
    enabled: !!effectiveSupplierId,
    staleTime: 10_000,
  });

  const existing = useMemo(() => {
    const rows = myQuotation.data ?? [];
    const active = rows.find((q) => q.status !== "WITHDRAWN");
    const q = active ?? rows[0];
    if (!q) return null;
    return q;
  }, [myQuotation.data]);

  const buildBlankLines = (): LineRow[] =>
    quotableLineItems.length
      ? quotableLineItems.map((li) => blankLineFromRfq(li))
      : [blankCustomLine(1)];

  // Form state.
  const [lines, setLines] = useState<LineRow[]>(buildBlankLines);
  const [editingDescIds, setEditingDescIds] = useState<Set<string>>(() => new Set());
  const [quoteCurrency, setQuoteCurrency] = useState<QuoteCurrency>(() => normalizeQuoteCurrency(currency));
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [moq,          setMoq         ] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [incoterm,     setIncoterm     ] = useState(
    INCOTERMS.includes(defaultIncoterm as (typeof INCOTERMS)[number]) ? defaultIncoterm! : "",
  );
  const [sampleAvail,  setSampleAvail  ] = useState<"" | "yes" | "no">("");
  const [validUntil,   setValidUntil   ] = useState("");
  const [notes,        setNotes       ] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const scopeKey = quotableLineItems.map((li) => li.id).join(",");
  const multiProductRfq = quotableLineItems.length > 1;
  const soleQuotableLineId = quotableLineItems.length === 1 ? quotableLineItems[0]!.id : undefined;
  const hasProductScope = !!allowedQuoteLineItemIds?.length;

  const toggleDescriptionEdit = (clientLineId: string) => {
    setEditingDescIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientLineId)) next.delete(clientLineId);
      else next.add(clientLineId);
      return next;
    });
  };

  const addRfqLineItem = (li: (typeof quotableLineItems)[number]) => {
    const isDuplicate = lines.some((l) => l.rfqLineItemId === li.id);
    const row = blankLineFromRfq(
      li,
      isDuplicate ? { description: `${li.description} — ` } : undefined,
    );
    setLines((rows) => [...rows, row]);
    if (isDuplicate) {
      setEditingDescIds((prev) => new Set(prev).add(row.clientLineId));
    }
  };

  // Reset form when user logs out/in or switches workspace — avoids stale draft after re-login.
  useEffect(() => {
    setLines(buildBlankLines());
    setQuoteCurrency(normalizeQuoteCurrency(currency));
    setLeadTimeDays("");
    setMoq("");
    setPaymentTerms("");
    setIncoterm(
      INCOTERMS.includes(defaultIncoterm as (typeof INCOTERMS)[number]) ? defaultIncoterm! : "",
    );
    setSampleAvail("");
    setValidUntil("");
    setNotes("");
    setHydrated(false);
    setEditingDescIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on identity/scope change
  }, [userId, workspaceId, scopeKey, currency]);

  // Hydrate form from existing quotation when it loads (once).
  useEffect(() => {
    if (!existing || hydrated || appendToQuotationId) return;
    setHydrated(true);
    if (existing.status === "WITHDRAWN") return;
    const detail = existing as typeof existing & {
      lineItems?: Array<{
        position: number;
        description: string;
        quantity: number;
        unitPrice: number;
        priceUnit?: string | null;
        packing?: string | null;
        moq?: number | null;
      }>;
    };
    if (detail.lineItems?.length) {
      const quoted = detail.lineItems.map((l) => {
        const rfqLine =
          quotableLineItems.find((li) => li.position === l.position)
          ?? quotableLineItems.find((li) => li.description.trim().toLowerCase() === l.description.trim().toLowerCase());
        return {
          clientLineId: newClientLineId(),
          rfqLineItemId: rfqLine?.id ?? soleQuotableLineId,
          position: l.position,
          description: l.description,
          quantity: String(l.quantity),
          uom: normalizeQuoteUom(l.priceUnit ?? rfqLine?.uom),
          unitPrice: String(l.unitPrice),
        };
      });
      setLines(
        multiProductRfq ? mergeQuotedAndAvailableLines(quoted, quotableLineItems) : quoted,
      );
    }
    setLeadTimeDays(existing.leadTimeDays?.toString() ?? "");
    setMoq(existing.moq?.toString() ?? "");
    setPaymentTerms(existing.paymentTerms ?? "");
    setQuoteCurrency(normalizeQuoteCurrency(existing.currency ?? currency));
    setIncoterm(existing.incoterm ?? "");
    setSampleAvail(
      existing.sampleAvail === true ? "yes" : existing.sampleAvail === false ? "no" : "",
    );
    setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : "");
  }, [existing, hydrated, appendToQuotationId, quotableLineItems, currency, multiProductRfq, soleQuotableLineId]);

  const existingLineItemsForPayload = useMemo(() => {
    if (!appendToQuotationId || !existing) return [];
    const detail = existing as typeof existing & {
      lineItems?: Array<{
        position: number;
        description: string;
        quantity: number;
        unitPrice: number;
        rfqLineItemId?: string | null;
        priceUnit?: string | null;
        packing?: string | null;
        moq?: number | null;
      }>;
    };
    return (detail.lineItems ?? []).map((l) => ({
      position: l.position,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      rfqLineItemId: l.rfqLineItemId ?? undefined,
      priceUnit: l.priceUnit ?? undefined,
      packing: l.packing ?? undefined,
      moq: l.moq ?? undefined,
    }));
  }, [appendToQuotationId, existing]);

  // ── Derived totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const perLine = lines.map((l) => {
      if (!l.unitPrice.trim()) return 0;
      const q = num(l.quantity);
      const p = num(l.unitPrice);
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
    });
    return {
      perLine,
    };
  }, [lines]);

  const quotedLines = useMemo(
    () => lines.filter((l) => l.unitPrice.trim() !== ""),
    [lines],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const validationError = useMemo(() => {
    if (!quotedLines.length) {
      return multiProductRfq
        ? "Price at least one product you want to quote (leave others blank or remove them)"
        : "Add at least one line item";
    }
    for (let i = 0; i < quotedLines.length; i++) {
      const l = quotedLines[i];
      if (!l.description.trim()) return `Line ${i + 1}: description required`;
      const q = num(l.quantity);
      const p = num(l.unitPrice);
      if (!Number.isFinite(q) || q <= 0) return `Line ${i + 1}: quantity must be > 0`;
      if (!Number.isFinite(p) || p < 0)  return `Line ${i + 1}: unit price must be ≥ 0`;
    }
    if (leadTimeDays) {
      const d = num(leadTimeDays);
      if (!Number.isFinite(d) || d <= 0 || !Number.isInteger(d))
        return "Lead time must be a whole number of days (e.g. 30)";
      if (d > 365) return "Lead time cannot exceed 365 days";
    }
    if (moq) {
      const m = num(moq);
      if (!Number.isFinite(m) || m <= 0 || !Number.isInteger(m))
        return "POQ must be a whole number";
    }
    if (validUntil) {
      const end = new Date(`${validUntil}T23:59:59`);
      if (Number.isNaN(end.getTime())) return "Quote validity date is invalid";
      if (end < new Date()) return "Quote validity must be today or later";
    }
    return null;
  }, [quotedLines, leadTimeDays, moq, validUntil, multiProductRfq]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const buildPayload = () =>
    buildSubmitQuotationPayload({
      currency: quoteCurrency,
      leadTimeDays,
      moq,
      paymentTerms,
      incoterm,
      sampleAvail,
      validUntil,
      notes,
      lines: quotedLines.map((l) => ({
        ...l,
        rfqLineItemId: l.rfqLineItemId ?? soleQuotableLineId,
      })),
    });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations"], exact: true });
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations", "mine"] });
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "admin-quote-scope"] });
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "timeline"] });
  };

  const submit = useMutation({
    mutationFn: (body: ReturnType<typeof buildSubmitQuotationPayload>) => {
      if (adminMode && onBehalfOfSupplierId) {
        return api
          .post(`/rfq/${workspaceId}/quotations/admin`, { ...body, supplierUserId: onBehalfOfSupplierId })
          .then((r) => r.data);
      }
      return api.post(`/rfq/${workspaceId}/quotations`, body).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(adminMode ? "Quotation submitted on behalf of supplier" : "Quotation submitted");
      invalidate();
    },
    onError: (e: unknown) => toast.error(formatApiValidationError(e)),
  });

  const revise = useMutation({
    mutationFn: (body: ReturnType<typeof buildSubmitQuotationPayload>) => {
      if (adminMode && onBehalfOfSupplierId) {
        return api
          .patch(`/rfq/${workspaceId}/quotations/admin/${existing!.id}`, {
            ...body,
            supplierUserId: onBehalfOfSupplierId,
          })
          .then((r) => r.data);
      }
      return api.patch(`/rfq/${workspaceId}/quotations/${existing!.id}`, body).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(adminMode ? "Supplier quotation revised" : "Quotation revised");
      invalidate();
    },
    onError: (e: unknown) => toast.error(formatApiValidationError(e)),
  });

  const runSubmit = () => {
    try {
      const body = buildPayload();
      if (appendToQuotationId && existing) {
        const merged = {
          ...body,
          lineItems: [...existingLineItemsForPayload, ...body.lineItems],
        };
        revise.mutate(merged);
        return;
      }
      submit.mutate(body);
    } catch (e) {
      toast.error(formatQuotationValidationError(e));
    }
  };

  const runRevise = () => {
    try {
      revise.mutate(buildPayload());
    } catch (e) {
      toast.error(formatQuotationValidationError(e));
    }
  };

  const withdraw = useMutation({
    mutationFn: () =>
      api.delete(`/rfq/${workspaceId}/quotations/${existing!.id}`, { data: { reason: withdrawReason } }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Quotation withdrawn");
      setWithdrawOpen(false); setWithdrawReason("");
      setLines(buildBlankLines());
      setQuoteCurrency(normalizeQuoteCurrency(currency));
      setLeadTimeDays(""); setMoq(""); setPaymentTerms("");
      setIncoterm(
        INCOTERMS.includes(defaultIncoterm as (typeof INCOTERMS)[number]) ? defaultIncoterm! : "",
      );
      setSampleAvail(""); setValidUntil(""); setNotes("");
      setHydrated(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? "Withdraw failed"),
  });

  const busy = submit.isPending || revise.isPending || withdraw.isPending;
  const mode: "compose" | "review" =
    appendToQuotationId
      ? "compose"
      : !existing || existing.status === "WITHDRAWN"
        ? "compose"
        : "review";

  const updateLine = (i: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  if (!quotableLineItems.length) {
    return (
      <section
        data-testid="supplier-quote-form-scoped-empty"
        className="bg-white border border-paper-200 rounded-xl shadow-sm p-5"
      >
        <p className="text-sm text-zinc-600">
          No products are assigned to your company for this RFQ yet. Contact the buyer if you believe this is an error.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid={adminMode ? "admin-supplier-quote-form" : "supplier-quote-form"}
      data-guide="quotation-form"
      className={
        embedded
          ? "overflow-hidden"
          : "bg-white border border-paper-200 rounded-2xl shadow-sm overflow-hidden"
      }
    >
      <header className={`flex items-start justify-between gap-3 ${embedded ? "px-5 pt-4 sm:px-6" : "px-5 pt-5 sm:px-6 sm:pt-6"}`}>
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            {mode === "compose" ? <FilePlus className="h-4 w-4 text-accent-900" /> : <FilePen className="h-4 w-4 text-accent-900" />}
            {adminMode
              ? mode === "compose"
                ? `Submit quotation for ${onBehalfOfSupplierName ?? "supplier"}`
                : `Quotation for ${onBehalfOfSupplierName ?? "supplier"}`
              : mode === "compose"
                ? "Submit your quotation"
                : "Your quotation"}
          </h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">
            {adminMode
              ? appendToQuotationId
                ? "This supplier already quoted some assigned products. Enter pricing only for the remaining products below."
                : "Enter pricing on behalf of the assigned supplier. The quote will appear under their name in the comparison."
              : mode === "compose"
                ? multiProductRfq
                  ? "Quote only the products you supply. Use the pencil to label variants (e.g. Olive Oil — 500 ml vs 10 L), add the same product again with + Add product, or remove lines you do not quote."
                  : "Price the RFQ line. The buyer will compare quotations once they close the window."
                : `Last ${existing!.status.toLowerCase()} ${new Date(existing!.submittedAt).toLocaleString()}.`}
          </p>
        </div>
        {mode === "review" && (
          <span
            data-testid="quote-status-badge"
            className={
              "text-[10px] uppercase tracking-wider px-2 py-1 rounded font-medium shrink-0 " +
              (existing!.status === "REVISED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")
            }
          >
            {existing!.status}
          </span>
        )}
      </header>

      {/* ── Line items ─────────────────────────────────────────────────── */}
      <div className="mt-5 mx-5 sm:mx-6 rounded-xl border border-paper-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-paper-50 border-b border-paper-200">
          <div>
            <h3 className="dmx-eyebrow text-zinc-500">Line items</h3>
            {multiProductRfq && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Optional per product — only priced lines are submitted. Same product can appear on multiple lines.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Currency</span>
            <CurrencySelect
              testId="quote-currency"
              value={quoteCurrency}
              onChange={setQuoteCurrency}
              compact
            />
          </div>
        </div>

        <div className={`hidden ${LINE_GRID} px-4 py-2.5 bg-white border-b border-paper-100 text-[10px] uppercase tracking-wider text-zinc-500`} lang="en">
          <span>Product</span>
          <span className="text-right">Qty</span>
          <span>Unit</span>
          <span className="text-right">Unit price</span>
          <span className="text-right">Line total</span>
          <span className="sr-only">Remove</span>
        </div>

        <div className="divide-y divide-paper-100">
          {lines.map((l, i) => {
            const isQuoted = l.unitPrice.trim() !== "";
            const isEditingDescription = !l.rfqLineItemId || editingDescIds.has(l.clientLineId);
            return (
            <div
              key={l.clientLineId}
              data-testid={`quote-line-${i}`}
              className={`grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 bg-white ${LINE_GRID} ${
                multiProductRfq && l.rfqLineItemId && !isQuoted ? "opacity-60" : ""
              }`}
            >
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <span className="sm:sr-only text-[10px] uppercase tracking-wider text-zinc-400">Product</span>
                {isEditingDescription ? (
                  <Input
                    data-testid={`quote-line-${i}-description`}
                    className="h-10 mt-0.5 sm:mt-0"
                    value={l.description}
                    placeholder="e.g. Olive Oil — 500 ml"
                    onChange={(e) => updateLine(i, { description: e.target.value })}
                  />
                ) : (
                  <div className="flex items-start gap-2 min-w-0 sm:mt-0 mt-0.5">
                    <p
                      data-testid={`quote-line-${i}-description`}
                      className="text-sm font-medium text-ink-900 leading-snug flex-1 min-w-0"
                      title={l.description}
                    >
                      {l.description}
                    </p>
                    <button
                      type="button"
                      data-testid={`quote-line-${i}-edit-description`}
                      onClick={() => toggleDescriptionEdit(l.clientLineId)}
                      className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-accent-900 hover:bg-accent-50"
                      aria-label={`Edit description for line ${i + 1}`}
                      title="Edit product label"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {l.rfqLineItemId && isEditingDescription && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-zinc-500 hover:text-ink-900 underline"
                    onClick={() => toggleDescriptionEdit(l.clientLineId)}
                  >
                    Done editing
                  </button>
                )}
              </div>

              <label className="block sm:contents">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 sm:hidden">Qty</span>
                <input
                  data-testid={`quote-line-${i}-quantity`}
                  className={`${lineInputClass} mt-1 sm:mt-0 text-right`}
                  placeholder="Qty"
                  value={l.quantity}
                  inputMode="decimal"
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                />
              </label>

              <label className="block sm:contents">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 sm:hidden">Unit</span>
                <select
                  data-testid={`quote-line-${i}-uom`}
                  className={`${fieldSelectClass} mt-1 sm:mt-0`}
                  value={l.uom}
                  onChange={(e) => updateLine(i, { uom: e.target.value })}
                >
                  {QUOTE_UOM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="block col-span-2 sm:col-span-1 sm:contents">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 sm:hidden">
                  Unit price ({quoteCurrency})
                </span>
                <input
                  data-testid={`quote-line-${i}-unit-price`}
                  className={`${lineInputClass} mt-1 sm:mt-0 text-right`}
                  placeholder={multiProductRfq && l.rfqLineItemId ? "Skip — no quote" : "0.00"}
                  value={l.unitPrice}
                  inputMode="decimal"
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                />
              </label>

              <div className="col-span-1 flex flex-col justify-center sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 sm:hidden">Line total</span>
                <div
                  data-testid={`quote-line-${i}-total`}
                  className="text-sm font-semibold tabular-nums text-ink-900 sm:text-right mt-0.5 sm:mt-0"
                >
                  {totals.perLine[i].toFixed(2)}
                  <span className="sm:block text-[10px] font-normal text-zinc-400 ml-1 sm:ml-0">{quoteCurrency}</span>
                </div>
              </div>

              <div className="col-span-1 flex items-end justify-end sm:items-center sm:justify-center">
                <button
                  type="button"
                  data-testid={`quote-line-${i}-remove`}
                  disabled={quotedLines.length <= 1 && isQuoted}
                  onClick={() => setLines((rows) => rows.filter((_, idx) => idx !== i))}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={`Remove line ${i + 1}`}
                  title={l.rfqLineItemId ? "Remove product from this quote" : "Remove line"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
          })}
        </div>

        <div className="px-4 py-3 bg-paper-50 border-t border-paper-200 flex flex-wrap items-center gap-3">
          {multiProductRfq && quotableLineItems.length > 0 && (
            <label className="inline-flex items-center gap-2 text-sm text-ink-900">
              <Plus className="h-4 w-4 text-accent-900 shrink-0" aria-hidden />
              <span className="text-zinc-500">Add product</span>
              <select
                data-testid="quote-add-rfq-line"
                defaultValue=""
                className={`${fieldSelectClass} w-auto min-w-[12rem]`}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const li = quotableLineItems.find((x) => x.id === id);
                  if (li) addRfqLineItem(li);
                  e.target.value = "";
                }}
              >
                <option value="">— Select —</option>
                {quotableLineItems.map((li) => (
                  <option key={li.id} value={li.id}>{li.description}</option>
                ))}
              </select>
            </label>
          )}
          {!multiProductRfq && hasProductScope && soleQuotableLineId && (
            <button
              type="button"
              data-testid="quote-add-line"
              onClick={() => addRfqLineItem(quotableLineItems[0]!)}
              className="text-sm font-medium text-accent-900 hover:text-accent-700 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add variation
            </button>
          )}
          {!multiProductRfq && !hasProductScope && (
            <button
              type="button"
              data-testid="quote-add-line"
              onClick={() => setLines((rows) => [...rows, blankCustomLine(rows.length + 1)])}
              className="text-sm font-medium text-accent-900 hover:text-accent-700 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add line
            </button>
          )}
        </div>
      </div>

      {/* ── Commercial terms ───────────────────────────────────────────── */}
      <div className="px-5 sm:px-6 pt-5 pb-2">
        <h3 className="dmx-eyebrow text-zinc-500 mb-3">Commercial terms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Lead time (days)</span>
            <Input
              data-testid="quote-lead-time"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 30"
              className="mt-1.5 h-10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">POQ</span>
            <Input
              data-testid="quote-moq"
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 50"
              className="mt-1.5 h-10"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Payment terms</span>
            <Input
              data-testid="quote-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 30% TT, 70% BL"
              className="mt-1.5 h-10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Incoterm</span>
            <select
              data-testid="quote-incoterm"
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
              className={`${fieldSelectClass} mt-1.5`}
            >
              <option value="">— Select —</option>
              {INCOTERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Sample available</span>
            <select
              data-testid="quote-sample"
              value={sampleAvail}
              onChange={(e) => setSampleAvail(e.target.value as "" | "yes" | "no")}
              className={`${fieldSelectClass} mt-1.5`}
            >
              <option value="">— Not specified —</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Quote valid until</span>
            <Input
              data-testid="quote-valid-until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1.5 h-10"
            />
          </label>
        </div>
      </div>

      {/* ── Footer: validation + actions ─────────────────────────────── */}
      <div className="mt-4 mx-5 sm:mx-6 mb-5 sm:mb-6 rounded-xl border border-paper-200 bg-paper-50 px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm min-w-0">
            {validationError ? (
              <span data-testid="quote-validation-error" className="text-amber-800 inline-flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Ready to submit
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
              {mode === "compose" ? (
                <Button
                  data-testid="quote-submit"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={!!validationError || busy}
                  loading={submit.isPending}
                  onClick={runSubmit}
                >
                  Submit quotation
                </Button>
              ) : (
                <>
                  <Button
                    data-testid="quote-revise"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={!!validationError || busy}
                    loading={revise.isPending}
                    onClick={runRevise}
                  >
                    {adminMode ? "Save supplier revision" : "Submit revision"}
                  </Button>
                  {!adminMode && (
                  <Button
                    data-testid="quote-withdraw"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setWithdrawOpen(true)}
                  >
                    Withdraw quotation
                  </Button>
                  )}
                </>
              )}
          </div>
        </div>
      </div>

      {!adminMode && (
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Withdraw quotation"
        description="This removes your offer from the comparison. You can re-submit while the RFQ is still open."
        size="md"
        testId="withdraw-quote-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button
              data-testid="quote-withdraw-confirm"
              variant="destructive"
              loading={withdraw.isPending}
              disabled={withdrawReason.trim().length < 3}
              onClick={() => withdraw.mutate()}
            >
              Withdraw
            </Button>
          </>
        }
      >
        <label className="text-[11px] uppercase tracking-wider text-zinc-500">Reason (≥ 3 chars)</label>
        <Textarea
          data-testid="withdraw-reason"
          value={withdrawReason}
          onChange={(e) => setWithdrawReason(e.target.value)}
          placeholder="Why are you withdrawing?"
          rows={3}
          className="mt-1"
        />
      </Modal>
      )}
    </section>
  );
}
