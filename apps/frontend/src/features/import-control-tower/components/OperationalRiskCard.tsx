import { Link } from "react-router-dom";
import type { OperationalRiskItem } from "@dmx/contracts/import-control-tower";
import { cn } from "@/lib/utils";

const SEV = {
  Critical: "border-red-300 bg-red-50",
  High: "border-amber-300 bg-amber-50",
  Medium: "border-blue-200 bg-blue-50/50",
  Low: "border-zinc-200 bg-zinc-50",
};

export function OperationalRiskCard({ items }: { items: OperationalRiskItem[] }) {
  return (
    <section data-testid="ict-risks" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
        <h2 className="text-sm font-semibold text-ink-900">Operational Risks</h2>
      </div>
      <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto dmx-thin-scroll">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No active operational risks.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.workspaceUrl}
              data-testid={`ict-risk-${item.id}`}
              className={cn("block rounded-lg border p-3 text-sm hover:opacity-90", SEV[item.severity])}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-[10px] uppercase text-zinc-500">{item.severity}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-600">{item.kind} · {item.tradeRef}</div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
