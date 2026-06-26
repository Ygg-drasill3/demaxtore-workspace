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
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FilePen, FilePlus, AlertCircle, CheckCircle2 } from "lucide-react";
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

interface Props {
  workspaceId: string;
  rfqLineItems: Array<{ id: string; position: number; description: string; quantity: number; uom: string }>;
  currency:     string;
  /** Buyer RFQ incoterm — pre-fills supplier quote when set. */
  defaultIncoterm?: string;
}

interface LineRow {
  rfqLineItemId?: string;
  position:     number;
  description:  string;
  quantity:     string;
  unitPrice:    string;
}

const num = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export function SupplierQuoteForm({ workspaceId, rfqLineItems, currency, defaultIncoterm }: Props) {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  const myQuotation = useQuery({
    queryKey: ["rfq", workspaceId, "quotations", "mine", userId],
    queryFn: async () => {
      const r = await api.get(`/rfq/${workspaceId}/quotations`);
      const rows = normalizeQuotationList(r.data);
      return userId ? rows.filter((q) => q.supplierId === userId) : rows;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });

  const existing = useMemo(() => {
    const rows = myQuotation.data ?? [];
    const active = rows.find((q) => q.status !== "WITHDRAWN");
    const q = active ?? rows[0];
    if (!q) return null;
    return q;
  }, [myQuotation.data]);

  // Form state.
  const [lines, setLines] = useState<LineRow[]>(() =>
    rfqLineItems.length
      ? rfqLineItems.map((li) => ({
          rfqLineItemId: li.id, position: li.position,
          description: li.description,
          quantity: String(li.quantity),
          unitPrice: "",
        }))
      : [{ position: 1, description: "", quantity: "1", unitPrice: "" }],
  );
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

  // Hydrate form from existing quotation when it loads (once).
  useMemo(() => {
    if (!existing || hydrated) return;
    setHydrated(true);
    if (existing.status === "WITHDRAWN") return; // keep blank form (re-submit flow)
    const detail = existing as typeof existing & {
      lineItems?: Array<{ position: number; description: string; quantity: number; unitPrice: number }>;
    };
    if (detail.lineItems?.length) {
      setLines(detail.lineItems.map((l) => ({
        position: l.position,
        description: l.description,
        quantity: String(l.quantity),
        unitPrice: String(l.unitPrice),
      })));
    }
    setLeadTimeDays(existing.leadTimeDays?.toString() ?? "");
    setMoq(existing.moq?.toString() ?? "");
    setPaymentTerms(existing.paymentTerms ?? "");
    setIncoterm(existing.incoterm ?? "");
    setSampleAvail(
      existing.sampleAvail === true ? "yes" : existing.sampleAvail === false ? "no" : "",
    );
    setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : "");
  }, [existing, hydrated]);

  // ── Derived totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const perLine = lines.map((l) => {
      const q = num(l.quantity);
      const p = num(l.unitPrice);
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
    });
    return {
      perLine,
      grand: perLine.reduce((a, b) => a + b, 0),
    };
  }, [lines]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validationError = useMemo(() => {
    if (!lines.length) return "Add at least one line item";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
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
        return "MOQ must be a whole number";
    }
    if (validUntil) {
      const end = new Date(`${validUntil}T23:59:59`);
      if (Number.isNaN(end.getTime())) return "Quote validity date is invalid";
      if (end < new Date()) return "Quote validity must be today or later";
    }
    return null;
  }, [lines, leadTimeDays, validUntil]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const buildPayload = () =>
    buildSubmitQuotationPayload({
      currency,
      leadTimeDays,
      moq,
      paymentTerms,
      incoterm,
      sampleAvail,
      validUntil,
      notes,
      lines,
    });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations"], exact: true });
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations", "mine"] });
    qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "timeline"] });
  };

  const submit = useMutation({
    mutationFn: (body: ReturnType<typeof buildSubmitQuotationPayload>) =>
      api.post(`/rfq/${workspaceId}/quotations`, body).then((r) => r.data),
    onSuccess: () => {
      toast.success("Quotation submitted", `Total ${totals.grand.toFixed(2)} ${currency}`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(formatApiValidationError(e)),
  });

  const revise = useMutation({
    mutationFn: (body: ReturnType<typeof buildSubmitQuotationPayload>) =>
      api.patch(`/rfq/${workspaceId}/quotations/${existing!.id}`, body).then((r) => r.data),
    onSuccess: () => {
      toast.success("Quotation revised", `New total ${totals.grand.toFixed(2)} ${currency}`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(formatApiValidationError(e)),
  });

  const runSubmit = () => {
    try {
      submit.mutate(buildPayload());
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
      // Reset form for potential re-submit.
      setLines(rfqLineItems.length
        ? rfqLineItems.map((li) => ({
            rfqLineItemId: li.id, position: li.position, description: li.description,
            quantity: String(li.quantity), unitPrice: "",
          }))
        : [{ position: 1, description: "", quantity: "1", unitPrice: "" }],
      );
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
    !existing || existing.status === "WITHDRAWN" ? "compose" : "review";

  const updateLine = (i: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <section
      data-testid="supplier-quote-form"
      className="bg-white border border-paper-200 rounded-xl shadow-sm p-5 space-y-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            {mode === "compose" ? <FilePlus className="h-4 w-4 text-accent-900" /> : <FilePen className="h-4 w-4 text-accent-900" />}
            {mode === "compose" ? "Submit your quotation" : "Your quotation"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === "compose"
              ? "Price each RFQ line. The buyer will compare quotations once they close the window."
              : `Last ${existing!.status.toLowerCase()} ${new Date(existing!.submittedAt).toLocaleString()}.`}
          </p>
        </div>
        {mode === "review" && (
          <span
            data-testid="quote-status-badge"
            className={
              "text-[10px] uppercase tracking-wider px-2 py-1 rounded font-medium " +
              (existing!.status === "REVISED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")
            }
          >
            {existing!.status}
          </span>
        )}
      </header>

      {/* ── Line items ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div
            key={i}
            data-testid={`quote-line-${i}`}
            className="grid grid-cols-12 gap-2 items-center"
          >
            <input
              data-testid={`quote-line-${i}-description`}
              className="col-span-5 h-10 px-3 rounded-md border border-paper-200 text-sm"
              placeholder="Description"
              value={l.description}
              onChange={(e) => updateLine(i, { description: e.target.value })}
            />
            <input
              data-testid={`quote-line-${i}-quantity`}
              className="col-span-2 h-10 px-3 rounded-md border border-paper-200 text-sm text-right tabular-nums"
              placeholder="Qty"
              value={l.quantity}
              inputMode="decimal"
              onChange={(e) => updateLine(i, { quantity: e.target.value })}
            />
            <input
              data-testid={`quote-line-${i}-unit-price`}
              className="col-span-2 h-10 px-3 rounded-md border border-paper-200 text-sm text-right tabular-nums"
              placeholder="Unit price"
              value={l.unitPrice}
              inputMode="decimal"
              onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
            />
            <div
              data-testid={`quote-line-${i}-total`}
              className="col-span-2 text-right text-sm font-mono tabular-nums text-zinc-700"
            >
              {totals.perLine[i].toFixed(2)}
            </div>
            <button
              type="button"
              data-testid={`quote-line-${i}-remove`}
              disabled={lines.length <= 1}
              onClick={() => setLines((rows) => rows.filter((_, idx) => idx !== i))}
              className="col-span-1 h-10 flex items-center justify-center text-zinc-400 hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="quote-add-line"
          onClick={() =>
            setLines((rows) => [...rows, { position: rows.length + 1, description: "", quantity: "1", unitPrice: "" }])
          }
          className="text-xs font-medium text-accent-900 hover:underline inline-flex items-center gap-1 mt-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
      </div>

      {/* ── Aux fields ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-paper-100">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Lead time (days)</span>
          <Input
            data-testid="quote-lead-time"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 30"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">MOQ</span>
          <Input
            data-testid="quote-moq"
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 50"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Payment terms</span>
          <Input
            data-testid="quote-payment-terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. 30% TT, 70% BL"
            className="mt-1"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Incoterm</span>
          <select
            data-testid="quote-incoterm"
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value)}
            className="mt-1 h-10 w-full px-3 rounded-md border border-paper-200 text-sm bg-white"
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
            className="mt-1 h-10 w-full px-3 rounded-md border border-paper-200 text-sm bg-white"
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
            className="mt-1"
          />
        </label>
      </div>

      {/* ── Grand total + validation ───────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-paper-100">
        <div className="text-xs text-zinc-500">
          {validationError ? (
            <span data-testid="quote-validation-error" className="text-amber-700 inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {validationError}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">Grand total</div>
          <div
            data-testid="quote-grand-total"
            className="text-xl font-semibold tabular-nums font-mono text-ink-900"
          >
            {totals.grand.toFixed(2)} <span className="text-sm font-medium text-zinc-500">{currency}</span>
          </div>
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pt-2">
        {mode === "compose" ? (
          <Button
            data-testid="quote-submit"
            variant="primary"
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
              disabled={!!validationError || busy}
              loading={revise.isPending}
              onClick={runRevise}
            >
              Submit revision
            </Button>
            <Button
              data-testid="quote-withdraw"
              variant="ghost"
              disabled={busy}
              onClick={() => setWithdrawOpen(true)}
            >
              Withdraw quotation
            </Button>
          </>
        )}
      </div>

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
    </section>
  );
}
