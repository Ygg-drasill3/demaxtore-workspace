import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useDashboardShipments } from "../../hooks/useDashboardShipments";
import { displayName, displayRef } from "../../lib/display-ref";

const STATUS_DOT: Record<string, string> = {
  "On Track": "bg-emerald-500",
  "At Risk": "bg-amber-500",
  Delayed: "bg-red-500",
  Delivered: "bg-zinc-400",
  Cancelled: "bg-zinc-300",
};

export function MyShipmentsWidget() {
  const { t } = useT();
  const { active, isLoading } = useDashboardShipments();

  return (
    <section data-testid="my-shipments-widget" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between bg-zinc-50/80">
        <h2 className="font-display text-lg font-semibold">{t("dash.shipments.title")}</h2>
        <Link to="/shipments/portfolio" data-testid="my-shipments-view-all" className="text-xs font-medium text-accent-900 hover:underline">
          {t("dash.common.openArrow")}
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <p className="text-sm text-zinc-500">{t("dash.common.loadingShipments")}</p>
        ) : active.length === 0 ? (
          <p data-testid="my-shipments-empty" className="text-sm text-zinc-500">{t("dash.shipments.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {active.slice(0, 5).map((s) => (
              <li key={s.shipmentId} data-testid={`my-shipment-${s.shipmentId}`} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status] ?? "bg-zinc-300"}`} />
                    <span className="text-sm font-medium text-ink-900 truncate">
                      {displayName(s.supplierName, displayRef(s.shipmentNumber))}
                    </span>
                  </div>
                  {s.openAlertCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      {s.openAlertCount}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-zinc-500 truncate">
                  {s.origin} → {s.destination} · {s.currentMilestone}
                  {s.eta ? ` · ${t("dash.common.eta", "ETA")} ${new Date(s.eta).toLocaleDateString()}` : ""}
                </div>
                <Link
                  to={s.tradeWorkspaceUrl}
                  data-testid={`my-shipment-trade-${s.shipmentId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-900 hover:underline"
                >
                  {t("dash.common.open")} <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
