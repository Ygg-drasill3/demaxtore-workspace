import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { useDashboardShipments } from "../../hooks/useDashboardShipments";
import { displayName, displayRef } from "../../lib/display-ref";

const STATUS_STYLES: Record<string, string> = {
  "On Track": "bg-emerald-50 text-emerald-800",
  "At Risk": "bg-amber-50 text-amber-800",
  Delayed: "bg-red-50 text-red-800",
};

/** Sprint 43 — dashboard snippet of active imports (top 3 shipments). */
export function ActiveImportsWidget() {
  const { t } = useT();
  const { active, isLoading } = useDashboardShipments();
  const items = active.slice(0, 3);

  return (
    <section className="dmx-card p-0 overflow-hidden" data-testid="active-imports-widget">
      <div className="px-4 py-3 border-b border-paper-200 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-ink-900">
          {t("s43.widget.activeImports", "Active imports")}
        </h2>
        <Link to="/buyer/imports" className="text-xs font-medium text-accent-900 hover:underline">
          {t("dash.common.openArrow", "Open →")}
        </Link>
      </div>
      <div className="p-4">
        {isLoading && (
          <p className="text-sm text-zinc-500">{t("dash.common.loadingShipments", "Loading shipments…")}</p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-zinc-500" data-testid="active-imports-widget-empty">
            {t("s43.widget.noImports", "No active shipments. Start an import to track freight and customs.")}
          </p>
        )}
        {items.length > 0 && (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.shipmentId}>
                <Link
                  to={`/buyer/imports/${s.shipmentId}`}
                  className="block rounded-lg border border-paper-100 px-3 py-2.5 hover:border-paper-200 hover:bg-paper-50/80"
                  data-testid={`active-imports-widget-${s.shipmentId}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900 truncate">
                      {displayName(s.supplierName, displayRef(s.shipmentNumber))}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        STATUS_STYLES[s.status] ?? "bg-paper-100 text-zinc-600",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {s.origin} → {s.destination} · {s.currentMilestone}
                    {s.eta ? ` · ${t("dash.common.eta", "ETA")} ${new Date(s.eta).toLocaleDateString()}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-900">
                      {t("s43.widget.openImport", "Open import")} <ArrowRight className="h-3 w-3" />
                    </span>
                    {s.openAlertCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        {t("dash.common.alertCount", "{count} to resolve", { count: s.openAlertCount })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
