import { Pin } from "lucide-react";
import type { TimelineItem } from "@dmx/contracts/conversation-hub";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import TimelineItemCard from "./TimelineItemCard";

interface Props {
  items: TimelineItem[];
  myUserId?: string;
  workspaceType?: CommWorkspaceType;
  workspaceId?: string;
  onTogglePin?: (item: TimelineItem) => void;
  onVisible?: (item: TimelineItem) => void;
}

export default function PinnedTimeline({
  items,
  myUserId,
  workspaceType,
  workspaceId,
  onTogglePin,
  onVisible,
}: Props) {
  if (!items.length) return null;

  return (
    <section data-testid="hub-pinned" className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Pin className="h-4 w-4 text-amber-700" />
        <h4 className="text-sm font-medium text-amber-900">Pinned</h4>
      </div>
      <ol className="relative border-l border-amber-200 ml-2 space-y-3">
        {items.map((item) => (
          <TimelineItemCard
            key={item.id}
            item={item}
            myUserId={myUserId}
            workspaceType={workspaceType}
            workspaceId={workspaceId}
            onVisible={() => onVisible?.(item)}
            onTogglePin={() => onTogglePin?.(item)}
          />
        ))}
      </ol>
    </section>
  );
}
