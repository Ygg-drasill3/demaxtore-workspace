import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { ShipmentOpsRow } from "../../lib/operations-command-center";

export function OperationsShipmentCenter({ rows, loading }: { rows?: ShipmentOpsRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-shipments" data-testid="oc-shipments" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.execution")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.shipmentCenter.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingShipments")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-shipments-empty" className="text-sm text-zinc-500">{t("dash.shipments.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} data-testid={`oc-shipment-${r.risk.replace(/\s/g, "-").toLowerCase()}`} className="p-3 rounded-lg border border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{r.ref}</span>
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${r.risk === "Delayed" || r.risk === "ETA drift" ? "bg-red-50 text-red-800" : "bg-zinc-100 text-zinc-700"}`}>
                  {r.risk}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{r.detail} · {r.state}</p>
              {r.eta && <p className="text-xs text-zinc-400">ETA: {new Date(r.eta).toLocaleDateString()}</p>}
              <Link to={r.workspaceUrl} data-testid={`oc-shipment-open-${r.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/operations" data-testid="oc-shipments-tracking" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
