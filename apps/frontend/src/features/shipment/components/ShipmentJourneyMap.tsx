import { shipmentMilestones, shipmentProgressPercent } from "@dmx/contracts/shipment.scripts";
import type { ShipmentState } from "@dmx/contracts/shipment.fsm";
import { cn } from "@/lib/utils";

interface Props {
  state: ShipmentState;
  eta?: string | null;
  isDelayed?: boolean;
}

export function ShipmentJourneyMap({ state, eta, isDelayed }: Props) {
  const milestones = shipmentMilestones(state);
  const progress = shipmentProgressPercent(state);

  return (
    <section data-testid="shipment-journey-map" className="dmx-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <span className="dmx-eyebrow text-zinc-500">Journey</span>
          <div className="font-display text-3xl font-semibold tabular-nums mt-1">{progress}%</div>
        </div>
        {eta && (
          <div className={cn("text-sm rounded-lg px-3 py-2", isDelayed ? "bg-amber-50 text-amber-900" : "bg-paper-50 text-zinc-700")}>
            <span className="text-xs uppercase tracking-wider opacity-70">ETA </span>
            <span className="font-medium">{new Date(eta).toLocaleDateString()}</span>
            {isDelayed && <span className="ml-2 text-xs font-medium">Delayed</span>}
          </div>
        )}
      </div>
      <div className="h-2 rounded-full bg-paper-100 overflow-hidden mb-4">
        <div
          className={cn("h-full rounded-full transition-all", isDelayed ? "bg-amber-500" : "bg-accent-900")}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <span
            key={m.key}
            data-testid={`shipment-milestone-${m.key}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              m.status === "done" && "bg-emerald-50 text-emerald-800",
              m.status === "current" && "bg-accent-900 text-white",
              m.status === "pending" && "bg-paper-100 text-zinc-400",
            )}
          >
            {m.label}
          </span>
        ))}
      </div>
    </section>
  );
}
