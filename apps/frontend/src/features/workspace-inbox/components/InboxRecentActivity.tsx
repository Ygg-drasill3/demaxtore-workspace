import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import type { InboxActivity } from "@dmx/contracts/workspace-inbox";
import { formatWhen } from "../lib/workspace-inbox.utils";

interface Props {
  activity: InboxActivity[];
}

export default function InboxRecentActivity({ activity }: Props) {
  return (
    <section data-testid="inbox-recent-activity" className="dmx-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-zinc-600" />
        <h2 className="text-sm font-semibold text-zinc-900">Recent Activity</h2>
      </div>
      {activity.length === 0 ? (
        <p className="text-xs text-zinc-500">No recent activity across your workspaces.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-auto">
          {activity.map((a) => (
            <li key={a.id}>
              <Link
                to={a.conversationUrl}
                data-testid={`inbox-activity-${a.id}`}
                className="block rounded-lg border border-zinc-100 px-3 py-2 hover:bg-zinc-50 transition"
              >
                <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{a.body}</p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {a.workspaceRef} · {formatWhen(a.occurredAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
