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

    return {
      lowest:  lowestQ.total,
      highest: highestQ.total,
      average: totals.reduce((a, b) => a + b, 0) / totals.length,
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
      <CardHeader>
        <div>
          <CardEyebrow>Money summary</CardEyebrow>
          <CardTitle className="mt-1 text-sm">All amounts in {currency}</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        {estimatedValue != null && (
          <Row label="Estimated value (your target)" value={estimatedValue} currency={currency} testId="money-estimated" muted />
        )}
        {stats && (
          <>
            <Row label="Lowest quote"   value={stats.lowest}   currency={currency}
                 sub={stats.lowestSupplier}   testId="money-lowest"   highlight />
            <Row label="Highest quote"  value={stats.highest}  currency={currency}
                 sub={stats.highestSupplier}  testId="money-highest" />
            <Row label="Average quote"  value={Math.round(stats.average)} currency={currency} testId="money-average" />
            {stats.selected != null && (
              <Row label="Selected"       value={stats.selected} currency={currency}
                   testId="money-selected" highlight />
            )}
          </>
        )}
        <div className="pt-2 mt-1 border-t border-paper-200 flex items-center gap-1.5 text-xs text-zinc-500">
          <Lock className="h-3 w-3" /> Currency is locked after submission
        </div>
      </CardBody>
    </Card>
  );
}

function Row(props: {
  label:     string;
  value:     number;
  currency:  string;
  sub?:      string;
  testId?:   string;
  highlight?: boolean;
  muted?:     boolean;
}) {
  return (
    <div data-testid={props.testId} className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className={props.muted ? "text-zinc-500" : "text-ink-900"}>{props.label}</div>
        {props.sub && <div className="text-[11px] text-zinc-400 truncate">{props.sub}</div>}
      </div>
      <div className={"tabular-nums font-medium " + (props.highlight ? "text-accent-900" : "text-ink-900")}>
        {props.value.toLocaleString()}
      </div>
    </div>
  );
}
