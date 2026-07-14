// apps/frontend/src/features/rfq/components/MoneySummaryPanel.tsx
//
// Money is always visible (Sprint 2.5 §11). Renders when:
//   - any quotation exists, OR
//   - any line item has a target price (buyer estimated value).
//
import { useMemo } from "react";
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody } from "@/components/ui/Card";
import { Lock } from "lucide-react";
import { useQuotations } from "../hooks/useQuotations";
import { activeQuotations } from "../lib/quotations.normalize";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId:    string;
  currency:       string;
  estimatedValue?: number | null;
  selectedQuotationId?: string | null;
}

export function MoneySummaryPanel({ workspaceId, currency, estimatedValue, selectedQuotationId }: Props) {
  const { data } = useQuotations(workspaceId);
  const quotations = useMemo(() => activeQuotations(data ?? []), [data]);

  const stats = useMemo(() => {
    if (quotations.length === 0) return null;

    const lowestQ = quotations.reduce((best, q) => (q.total < best.total ? q : best));
    const highestQ = quotations.reduce((best, q) => (q.total > best.total ? q : best));
    const totals = quotations.map((q) => q.total);
    const lowest = lowestQ.total;
    const highest = highestQ.total;
    const average = totals.reduce((a, b) => a + b, 0) / totals.length;
    const priceDiff = lowest > 0 ? ((highest - lowest) / lowest) * 100 : 0;

    return {
      count: quotations.length,
      lowest,
      highest,
      average,
      priceDiff,
      selected: selectedQuotationId
        ? quotations.find((q) => q.id === selectedQuotationId)?.total ?? null
        : null,
      lowestSupplier:  lowestQ.supplierName,
      highestSupplier: highestQ.supplierName,
    };
  }, [quotations, selectedQuotationId]);

  if (!stats && estimatedValue == null) return null;

  return (
    <Card data-testid="money-summary-panel">
      <CardHeader className="pb-3">
        <div>
          <CardEyebrow>Money summary</CardEyebrow>
          <CardTitle className="mt-1 text-sm">All amounts in {currency}</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatBox label="Quotes received" value={String(stats.count)} testId="money-count" />
            <StatBox
              label="Lowest quote"
              value={stats.lowest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              sub={stats.lowestSupplier}
              testId="money-lowest"
              tone="success"
            />
            <StatBox
              label="Highest quote"
              value={stats.highest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              sub={stats.highestSupplier}
              testId="money-highest"
              tone="danger"
            />
            <StatBox
              label="Average quote"
              value={stats.average.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              testId="money-average"
            />
            <StatBox
              label="Price difference"
              value={`${stats.priceDiff.toFixed(1)}%`}
              testId="money-diff"
              tone="warning"
            />
          </div>
        )}

        {estimatedValue != null && (
          <div
            data-testid="money-estimated"
            className="rounded-lg border border-dashed border-accent-900/20 bg-accent-50/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <span className="text-sm text-zinc-600">Estimated value (your target)</span>
            <span className="text-sm font-semibold tabular-nums text-accent-900">
              {estimatedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
          </div>
        )}

        {stats?.selected != null && (
          <div className="rounded-lg border border-accent-900/20 bg-accent-50/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-ink-900">Selected quote</span>
            <span data-testid="money-selected" className="text-sm font-semibold tabular-nums text-accent-900">
              {stats.selected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Lock className="h-3 w-3 shrink-0" />
          Currency is locked after submission
        </div>
      </CardBody>
    </Card>
  );
}

function StatBox(props: {
  label: string;
  value: string;
  sub?: string;
  testId?: string;
  tone?: "success" | "danger" | "warning";
}) {
  return (
    <div
      data-testid={props.testId}
      className="rounded-xl border border-paper-200 bg-paper-50/60 px-3 py-3 min-w-0"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{props.label}</p>
      <p className={cn(
        "mt-1 text-lg font-bold tabular-nums leading-tight",
        props.tone === "success" && "text-emerald-600",
        props.tone === "danger" && "text-red-500",
        props.tone === "warning" && "text-orange-500",
        !props.tone && "text-ink-900",
      )}>
        {props.value}
      </p>
      {props.sub && (
        <p className="mt-1 text-[11px] text-zinc-400 truncate" title={props.sub}>
          {props.sub}
        </p>
      )}
    </div>
  );
}
