import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { ShipmentCommandRow } from "../../lib/buyer-command-center";

export function ShipmentCommandCenter({ rows, loading }: { rows?: ShipmentCommandRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-shipments" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.execution")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.shipmentCenter.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingShipments")}</p>
      ) : !rows?.length ? (
        <p data-testid="cc-shipments-empty" className="text-sm text-zinc-500">{t("dash.shipments.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li
              key={s.id}
              data-testid={`cc-shipment-row-${s.state}`}
              className={`p-3 rounded-lg border ${s.isDelayed ? "border-amber-300 bg-amber-50/50" : "border-zinc-100"}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-mono text-xs">{s.ref}</span>
                <span className="text-xs text-zinc-600">{s.state.replace(/_/g, " ")}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 space-x-2">
                <span>Order {s.orderRef}</span>
                {s.eta && <span>ETA {new Date(s.eta).toLocaleDateString()}</span>}
                {s.port && <span>{s.port}</span>}
                {s.isDelayed && <span className="text-amber-800 font-medium">Delayed / exception</span>}
              </div>
              <Link to={s.workspaceUrl} data-testid={`cc-shipment-open-${s.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
