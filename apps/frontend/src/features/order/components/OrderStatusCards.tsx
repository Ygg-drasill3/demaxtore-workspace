import { Factory, ClipboardCheck } from "lucide-react";

interface ProductionUpdate {
  label?: string;
  percentage?: number;
  updateType: string;
}

interface Props {
  state: string;
  productionUpdates?: ProductionUpdate[];
  inspectionResult?: string | null;
}

export function OrderStatusCards({ state, productionUpdates = [], inspectionResult }: Props) {
  const production = productionUpdates.filter((u) => u.updateType === "PRODUCTION");
  const latestProduction = production[production.length - 1];
  const showProduction = ["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS", "PRODUCTION_COMPLETED"].includes(state)
    || production.length > 0;
  const showInspection = ["INSPECTION_REQUESTED", "INSPECTION_COMPLETED"].includes(state) || inspectionResult;

  if (!showProduction && !showInspection) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {showProduction && (
        <section data-testid="order-production-section" className="dmx-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-accent-50 text-accent-900 grid place-items-center">
              <Factory className="h-4 w-4" />
            </div>
            <h2 className="font-medium">Production</h2>
          </div>
          {latestProduction ? (
            <>
              <div className="font-display text-2xl font-semibold tabular-nums">
                {latestProduction.percentage ?? 0}%
              </div>
              <p className="text-sm text-zinc-600 mt-1">{latestProduction.label ?? "In progress"}</p>
              {state === "PRODUCTION_IN_PROGRESS" && (latestProduction.percentage ?? 0) < 100 && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5 mt-2">
                  Üretim %100 raporlanana kadar sipariş bu aşamada kalır.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">Awaiting production updates from supplier</p>
          )}
          {production.length > 1 && (
            <ul className="text-xs mt-3 space-y-1 text-zinc-500 border-t border-paper-100 pt-2">
              {production.slice(-3).map((u, i) => (
                <li key={i}>{u.label} {u.percentage != null ? `(${u.percentage}%)` : ""}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {showInspection && (
        <section data-testid="order-inspection-section" className="dmx-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-800 grid place-items-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <h2 className="font-medium">Inspection</h2>
          </div>
          <p className="text-sm text-zinc-600">
            Result: <span className="font-medium text-ink-900">{inspectionResult ?? "Pending"}</span>
          </p>
        </section>
      )}
    </div>
  );
}
