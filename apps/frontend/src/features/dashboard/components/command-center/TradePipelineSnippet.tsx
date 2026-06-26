import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import { WorkspaceProgressBar } from "@/features/workspace/components/WorkspaceProgressBar";
import type { ActiveTradeRow } from "../../lib/buyer-command-center";

function milestonesForTrade(row: ActiveTradeRow) {
  const base = [
    { key: "sourcing", label: "Sourcing", status: "pending" as const },
    { key: "award", label: "Award", status: "pending" as const },
    { key: "order", label: "Order", status: "pending" as const },
    { key: "freight", label: "Freight", status: "pending" as const },
    { key: "shipment", label: "Shipment", status: "pending" as const },
  ];
  if (row.type === "RFQ" || row.type === "CommodityBid") {
    return base.map((m, i) => ({ ...m, status: i === 0 ? "current" as const : "pending" as const }));
  }
  if (row.type === "Order" || row.type === "PO") {
    return base.map((m, i) => ({ ...m, status: i < 2 ? "done" as const : i === 2 ? "current" as const : "pending" as const }));
  }
  if (row.type === "Shipment") {
    return base.map((m, i) => ({ ...m, status: i < 4 ? "done" as const : "current" as const }));
  }
  return base;
}

export function TradePipelineSnippet({ topTrade }: { topTrade?: ActiveTradeRow }) {
  const { t } = useT();

  if (!topTrade) return null;

  return (
    <section data-testid="cc-trade-pipeline-snippet" className="dmx-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.tradeLifecycle")}</span>
          <p className="text-sm font-medium mt-0.5">
            {topTrade.ref} · {topTrade.nextAction}
          </p>
        </div>
        <Link to={topTrade.workspaceUrl} className="text-sm font-medium text-accent-900 hover:underline">
          {t("dash.common.openArrow")}
        </Link>
      </div>
      <WorkspaceProgressBar milestones={milestonesForTrade(topTrade)} compact testId="cc-trade-pipeline-bar" />
    </section>
  );
}
