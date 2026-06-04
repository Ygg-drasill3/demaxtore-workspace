// apps/frontend/src/features/rfq/components/QuotationComparisonPanel.tsx
//
// Sprint 2.5 — quotations promoted from timeline events to first-class panel.
// Three render modes:
//   - empty (state == RFQ_OPEN, zero quotations) → explanation card
//   - matrix (state == QUOTATIONS_CLOSED / UNDER_EVALUATION) → compare grid
//   - collapsed (state ≥ SUPPLIER_SELECTED) → winner card with expandable others
//
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardEyebrow, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { Badge } from "@/components/ui/Badge";
import { useQuotations, useSelectQuotation } from "../hooks/useQuotations";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { cn } from "@/lib/utils";
import { Star, ChevronRight, TrendingDown, Clock, Layers, FileDown, Target } from "lucide-react";
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import { activeQuotations } from "../lib/quotations.normalize";

interface Props {
  workspaceId:    string;
  state:          RfqState;
  /** Optional buyer target (sum of lineItems.qty * targetPrice). */
  buyerTargetTotal?: number;
  buyerTargetLeadDays?: number;
  selectedQuotationId?: string | null;
  isOwner: boolean;
}

const SHOW_PANEL_STATES = new Set<RfqState>([
  "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION",
  "SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED",
  "PROFORMA_APPROVED", "PO_ISSUED",
]);

export function QuotationComparisonPanel(props: Props) {
  const { workspaceId, state, selectedQuotationId, isOwner } = props;
  const { data, isLoading } = useQuotations(SHOW_PANEL_STATES.has(state) ? workspaceId : undefined);

  if (!SHOW_PANEL_STATES.has(state)) return null;

  const quotations = activeQuotations(data ?? []);
  const isCollapsedDefault = (state === "SUPPLIER_SELECTED" ||
                              state === "PROFORMA_REQUESTED" ||
                              state === "PROFORMA_RECEIVED"  ||
                              state === "PROFORMA_APPROVED"  ||
                              state === "PO_ISSUED") && !!selectedQuotationId;

  if (isLoading) {
    return (
      <Card data-testid="quotations-panel-loading">
        <CardHeader><CardTitle>Quotations</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardBody>
      </Card>
    );
  }

  if (state === "RFQ_OPEN" && quotations.length === 0) {
    return <EmptyPanel />;
  }

  if (isCollapsedDefault) {
    return (
      <CollapsedPanel
        quotations={quotations}
        selectedId={selectedQuotationId!}
        workspaceId={workspaceId}
        state={state}
        isOwner={isOwner}
      />
    );
  }

  return (
    <MatrixPanel
      quotations={quotations}
      state={state}
      buyerTargetTotal={props.buyerTargetTotal}
      buyerTargetLeadDays={props.buyerTargetLeadDays}
      workspaceId={workspaceId}
      isOwner={isOwner}
    />
  );
}

// ---------------------------------------------------------------------------
function EmptyPanel() {
  return (
    <Card data-testid="quotations-panel-empty">
      <CardHeader>
        <div><CardEyebrow>Quotations</CardEyebrow><CardTitle className="mt-1">0 received</CardTitle></div>
      </CardHeader>
      <CardBody>
        <div className="rounded-xl border border-dashed border-paper-200 bg-paper-50/80 px-6 py-10 text-center">
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            Suppliers are reviewing your RFQ. Bids will land here as they arrive — you will be notified
            when the comparison view is ready.
          </p>
          <p className="text-xs text-zinc-400 mt-4">Track engagement in supplier activity above</p>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
type QuotationWithLines = QuotationRowDTO & {
  lineItems?: Array<{
    id: string;
    position: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

function MatrixPanel(props: {
  quotations: QuotationRowDTO[];
  state: RfqState;
  buyerTargetTotal?: number;
  buyerTargetLeadDays?: number;
  workspaceId: string;
  isOwner: boolean;
}) {
  const { quotations, state, buyerTargetTotal, buyerTargetLeadDays, workspaceId, isOwner } = props;
  const select = useSelectQuotation(workspaceId);
  const { track } = useTelemetry();
  const [showLineItems, setShowLineItems] = useState(false);
  const canSelect = state === "UNDER_EVALUATION" && isOwner;

  const lowestTotal = useMemo(() => Math.min(...quotations.map((q) => q.total)), [quotations]);
  const fastestLead = useMemo(() => {
    const leads = quotations.map((q) => q.leadTimeDays).filter((d): d is number => d != null);
    return leads.length ? Math.min(...leads) : null;
  }, [quotations]);

  const currency = quotations[0]?.currency ?? "USD";
  const priceSpread = useMemo(() => {
    const totals = quotations.map((q) => q.total);
    return Math.max(...totals) - Math.min(...totals);
  }, [quotations]);

  const lowestSupplier = quotations.find((q) => q.total === lowestTotal)?.supplierName;
  const fastestSupplier =
    fastestLead != null
      ? quotations.find((q) => q.leadTimeDays === fastestLead)?.supplierName
      : null;

  const rowsWithLines = quotations as QuotationWithLines[];
  const hasLineItems = rowsWithLines.some((q) => (q.lineItems?.length ?? 0) > 0);

  const gridCols = cn(
    "grid gap-3",
    quotations.length + (buyerTargetTotal != null ? 1 : 0) <= 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3",
  );

  return (
    <Card data-testid="quotations-panel-matrix">
      <CardHeader>
        <div>
          <CardEyebrow>Quotations</CardEyebrow>
          <CardTitle className="mt-1">{quotations.length} received</CardTitle>
        </div>
        <Badge tone="accent" dot>
          {state === "UNDER_EVALUATION" ? "Evaluation open" : "Ready to evaluate"}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className={gridCols} data-testid="quotation-matrix">
          {quotations.map((q) => (
            <SupplierQuoteCard
              key={q.id}
              quotation={q}
              currency={currency}
              isLowest={q.total === lowestTotal}
              isFastest={fastestLead != null && q.leadTimeDays === fastestLead}
              canSelect={canSelect}
              selectPending={select.isPending && select.variables?.quotationId === q.id}
              onSelect={() => {
                track("next_action.clicked", {
                  workspaceId,
                  targetId: "select_supplier",
                  meta: { quotationId: q.id },
                });
                select.mutate({
                  quotationId: q.id,
                  supplierUserId: q.supplierId,
                  rationale: "Selected from quotation comparison panel",
                });
              }}
            />
          ))}
          {buyerTargetTotal != null && (
            <div
              className="rounded-xl border border-dashed border-accent-900/25 bg-accent-50/40 p-4 flex flex-col"
              data-testid="quotation-buyer-target"
            >
              <div className="flex items-center gap-2 text-accent-900">
                <Target className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">Your target</span>
              </div>
              <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-accent-900">
                {formatMoney(currency, buyerTargetTotal)}
              </p>
              {buyerTargetLeadDays != null && (
                <p className="mt-2 text-sm text-zinc-600">{buyerTargetLeadDays} days lead (goal)</p>
              )}
              <p className="mt-auto pt-4 text-xs text-zinc-500 leading-relaxed">
                Compare each bid against this benchmark before awarding.
              </p>
            </div>
          )}
        </div>

        {canSelect && (
          <p className="text-xs text-zinc-500 leading-relaxed rounded-lg bg-paper-50 border border-paper-200 px-3 py-2.5">
            Awarding a supplier records your choice in the audit trail. Use{" "}
            <span className="font-medium text-ink-800">Select Supplier</span> in the hero card if you need a written rationale.
          </p>
        )}

        {showLineItems && hasLineItems && (
          <div
            className="rounded-xl border border-paper-200 overflow-hidden"
            data-testid="quotation-line-items"
          >
            <div className="px-4 py-2.5 bg-paper-50 border-b border-paper-200 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Line-item breakdown
              </span>
            </div>
            <div className="divide-y divide-paper-200">
              {rowsWithLines.map((q) =>
                (q.lineItems?.length ?? 0) > 0 ? (
                  <div key={q.id} className="px-4 py-3">
                    <div className="text-sm font-medium text-ink-900 mb-2">{q.supplierName}</div>
                    <ul className="space-y-1.5">
                      {q.lineItems!.map((li) => (
                        <li
                          key={li.id}
                          className="flex justify-between gap-3 text-xs text-zinc-600"
                        >
                          <span className="truncate">
                            {li.position}. {li.description}
                          </span>
                          <span className="tabular-nums shrink-0 text-ink-800">
                            {li.quantity} × {li.unitPrice.toLocaleString()} ={" "}
                            {li.total.toLocaleString()} {currency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3" data-testid="quotation-evaluation-summary">
          <InsightChip
            icon={TrendingDown}
            label="Price spread"
            value={`${formatMoney(currency, priceSpread)} between lowest and highest`}
          />
          <InsightChip
            icon={TrendingDown}
            label="Lowest total"
            value={lowestSupplier ? `${lowestSupplier} · ${formatMoney(currency, lowestTotal)}` : "—"}
          />
          <InsightChip
            icon={Clock}
            label="Fastest lead"
            value={
              fastestSupplier && fastestLead != null
                ? `${fastestSupplier} · ${fastestLead} days`
                : "Not specified by suppliers"
            }
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-paper-200/80">
          <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
            {quotations.length >= 2
              ? "Lowest price and shortest lead time may point to different suppliers — weigh both before you award."
              : "Waiting for more bids improves comparison confidence."}
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasLineItems && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowLineItems((v) => !v)}
              >
                <Layers className="h-3.5 w-3.5" />
                {showLineItems ? "Hide line items" : "Line-item comparison"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-zinc-600"
              onClick={() => {}}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function SupplierQuoteCard(props: {
  quotation: QuotationRowDTO;
  currency: string;
  isLowest: boolean;
  isFastest: boolean;
  canSelect: boolean;
  selectPending: boolean;
  onSelect: () => void;
}) {
  const { quotation: q, currency, isLowest, isFastest, canSelect, selectPending, onSelect } = props;

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 flex flex-col min-h-[220px] transition-shadow",
        isLowest ? "border-accent-900/30 shadow-sm ring-1 ring-accent-900/10" : "border-paper-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink-900 leading-snug pr-1">{q.supplierName}</h4>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isLowest && (
            <Badge tone="success" className="whitespace-nowrap">
              Lowest
            </Badge>
          )}
          {isFastest && (
            <Badge tone="info" className="whitespace-nowrap">
              Fastest
            </Badge>
          )}
        </div>
      </div>

      <div
        data-testid={`quote-total-${q.id}`}
        className={cn(
          "mt-3 font-display text-2xl font-semibold tabular-nums tracking-tight",
          isLowest && "text-accent-900",
        )}
      >
        {formatMoney(currency, q.total)}
        {isLowest && (
          <span className="sr-only"> lowest</span>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm flex-1">
        <MetricLine label="Unit price" value={q.unitPriceAvg != null ? q.unitPriceAvg.toLocaleString() : "—"} />
        <MetricLine
          label="Lead time"
          value={q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—"}
          highlight={isFastest}
        />
        <MetricLine label="Incoterm" value={q.incoterm ?? "—"} />
        <MetricLine
          label="Sample"
          value={q.sampleAvail == null ? "—" : q.sampleAvail ? "Available" : "Not offered"}
        />
        <MetricLine
          label="Valid until"
          value={q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
        />
      </dl>

      {canSelect && (
        <Button
          data-testid={`quote-select-${q.id}`}
          className="mt-4 w-full"
          size="sm"
          variant={isLowest ? "primary" : "secondary"}
          onClick={onSelect}
          loading={selectPending}
        >
          Select {q.supplierName.split(" ")[0]}
        </Button>
      )}
    </article>
  );
}

function MetricLine(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-paper-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{props.label}</dt>
      <dd
        className={cn(
          "tabular-nums text-ink-900 font-medium",
          props.highlight && "text-accent-900",
        )}
      >
        {props.value}
      </dd>
    </div>
  );
}

function InsightChip(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-lg bg-white border border-paper-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="h-3 w-3" />
        {props.label}
      </div>
      <p className="mt-1 text-sm text-ink-900 leading-snug">{props.value}</p>
    </div>
  );
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
function CollapsedPanel(props: {
  quotations: QuotationRowDTO[];
  selectedId: string;
  workspaceId: string;
  state: RfqState;
  isOwner: boolean;
}) {
  const { quotations, selectedId } = props;
  const [expanded, setExpanded] = useState(false);
  const winner = quotations.find((q) => q.id === selectedId);
  const others = quotations.filter((q) => q.id !== selectedId);

  if (!winner) return null;

  return (
    <Card data-testid="quotations-panel-collapsed">
      <CardHeader>
        <div>
          <CardEyebrow>Selected quotation</CardEyebrow>
          <CardTitle className="mt-1 inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-900 fill-accent-900" />
            {winner.supplierName}
          </CardTitle>
        </div>
        <Badge tone="accent" dot>Winner</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span data-testid="winner-total" className="font-display text-2xl font-semibold tabular-nums">
            {winner.currency} {winner.total.toLocaleString()}
          </span>
          {winner.leadTimeDays != null && <span className="text-sm text-zinc-600">{winner.leadTimeDays} days lead</span>}
          {winner.incoterm && <span className="text-sm text-zinc-600">· {winner.incoterm}</span>}
        </div>

        {others.length > 0 && (
          <button
            data-testid="quotations-collapsed-toggle"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-accent-900 font-medium hover:underline"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
            {expanded ? "Hide" : "Show"} other quotations ({others.length})
          </button>
        )}

        {expanded && (
          <ul data-testid="quotations-collapsed-others" className="divide-y divide-paper-200 -mx-2">
            {others.map((q) => (
              <li key={q.id} className="px-2 py-2.5 flex items-baseline justify-between gap-3 text-sm text-zinc-500">
                <span className="truncate">{q.supplierName}</span>
                <span className="tabular-nums shrink-0">
                  {q.currency} {q.total.toLocaleString()}
                  {q.leadTimeDays != null && <span className="ml-2 text-xs text-zinc-400">{q.leadTimeDays}d</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
