import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n/useT";
import { shipmentPortfolioApi } from "@/features/shipment/lib/shipment-portfolio.api";

/** Sprint 43 — dashboard snippet of active imports (top 3 shipments). */
export function ActiveImportsWidget() {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["shipment-portfolio", "dashboard-imports"],
    queryFn: () => shipmentPortfolioApi.getPortfolio({ limit: 3 }),
  });

  const items = data?.items ?? [];

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
                  to={`/workspace/shipment/${s.shipmentId}`}
                  className="block rounded-lg border border-paper-100 px-3 py-2.5 hover:border-paper-200 hover:bg-paper-50/80"
                  data-testid={`active-imports-widget-${s.shipmentId}`}
                >
                  <p className="text-sm font-medium text-ink-900">{s.shipmentNumber}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {s.origin} → {s.destination} · {s.fsmState.replace(/_/g, " ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
