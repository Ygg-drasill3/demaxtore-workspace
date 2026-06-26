import { Link } from "react-router-dom";
import type { UpcomingMilestoneItem } from "@dmx/contracts/import-control-tower";

export function UpcomingMilestonesCard({ items }: { items: UpcomingMilestoneItem[] }) {
  return (
    <section data-testid="ict-upcoming" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
        <h2 className="text-sm font-semibold text-ink-900">Upcoming Milestones</h2>
      </div>
      <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto dmx-thin-scroll">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming milestones scheduled.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.workspaceUrl}
              data-testid={`ict-upcoming-${item.id}`}
              className="block rounded-lg border border-zinc-100 p-3 text-sm hover:bg-zinc-50"
            >
              <div className="font-medium text-ink-900">{item.label}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {item.tradeRef} · {new Date(item.at).toLocaleDateString()}
                {item.responsibleParty ? ` · ${item.responsibleParty}` : ""}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
