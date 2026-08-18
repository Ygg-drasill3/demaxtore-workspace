import { useQuery } from "@tanstack/react-query";
import { tradeTimelineApi } from "../lib/trade-timeline.api";
import { TradeTimelineEventCard } from "./TradeTimelineEventCard";
import { TradeProgressBar } from "./TradeProgressBar";
import { CurrentMilestoneCard } from "./CurrentMilestoneCard";
import { NextMilestoneCard } from "./NextMilestoneCard";

interface TradeTimelineProps {
  tradeId: string;
}

export function TradeTimeline({ tradeId }: TradeTimelineProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trade-timeline", tradeId],
    queryFn: () => tradeTimelineApi.get(tradeId),
    enabled: !!tradeId,
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading timeline…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Could not load trade timeline.</p>;
  }

  return (
    <div data-testid="trade-timeline-engine" data-guide="workspace-timeline" className="space-y-5">
      <TradeProgressBar progressPercent={data.progressPercent} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrentMilestoneCard status={data.currentStatus} />
        <NextMilestoneCard milestone={data.nextMilestone} />
      </div>

      <div data-testid="trade-timeline-events" className="space-y-3 max-h-[480px] overflow-y-auto dmx-thin-scroll">
        {data.events.length === 0 ? (
          <p className="text-sm text-zinc-500">No timeline events yet.</p>
        ) : (
          [...data.events].reverse().map((event) => (
            <TradeTimelineEventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
