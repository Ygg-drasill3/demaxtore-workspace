import { useQuery } from "@tanstack/react-query";
import { purchaseOrderApi } from "../lib/purchase-order.api";

export default function PoOverviewWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["purchase-order", "dashboard"],
    queryFn: () => purchaseOrderApi.dashboard(),
  });

  if (isLoading) {
    return (
      <div data-testid="po-overview-widget" className="dmx-card p-4 text-sm text-zinc-500">
        Loading PO metrics…
      </div>
    );
  }

  return (
    <div data-testid="po-overview-widget" className="dmx-card p-4">
      <h2 className="font-display text-lg font-semibold mb-3">PO overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Metric testId="po-metric-open" label="Open POs" value={data?.openPoCount ?? 0} />
        <Metric testId="po-metric-ack-pending" label="Ack pending" value={data?.acknowledgementPending ?? 0} />
        <Metric testId="po-metric-amendments" label="Amendments open" value={data?.amendmentsOpen ?? 0} />
        <Metric testId="po-metric-value-open" label="PO value (open)" value={data?.poValueOpen ?? 0} money />
        <Metric testId="po-metric-value-closed" label="Closed PO value" value={data?.closedPoValue ?? 0} money />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  testId,
  money,
}: {
  label: string;
  value: number;
  testId: string;
  money?: boolean;
}) {
  return (
    <div data-testid={testId}>
      <span className="text-zinc-500 text-xs">{label}</span>
      <div className="text-lg font-semibold tabular-nums">
        {money ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value}
      </div>
    </div>
  );
}
