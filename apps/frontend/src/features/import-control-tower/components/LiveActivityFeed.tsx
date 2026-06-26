import { Link } from "react-router-dom";
import type { LiveActivityItem } from "@dmx/contracts/import-control-tower";

export function LiveActivityFeed({ items }: { items: LiveActivityItem[] }) {
  return (
    <section data-testid="ict-activity-feed" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
        <h2 className="text-sm font-semibold text-ink-900">Live Trade Activity</h2>
      </div>
      <ol className="p-4 space-y-3 max-h-[420px] overflow-y-auto dmx-thin-scroll">
        {items.length === 0 ? (
          <li className="text-sm text-zinc-500">No recent activity.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} data-testid={`ict-activity-${item.id}`}>
              <Link to={item.workspaceUrl} className="flex gap-3 text-sm hover:bg-zinc-50 rounded-lg p-2 -mx-2">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-900" />
                <div className="min-w-0">
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {item.tradeRef} · {item.sourceModule} · {new Date(item.occurredAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
