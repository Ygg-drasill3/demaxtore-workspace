import type { TradeTimelineCurrentStatus } from "@dmx/contracts/trade-timeline";

interface CurrentMilestoneCardProps {
  status: TradeTimelineCurrentStatus;
}

export function CurrentMilestoneCard({ status }: CurrentMilestoneCardProps) {
  return (
    <div
      data-testid="trade-current-milestone"
      className="rounded-xl border border-zinc-200 bg-gradient-to-br from-ink-950 to-ink-800 text-white p-5"
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/50">Current Stage</div>
      <div
        data-testid="trade-current-stage"
        className="mt-2 font-display text-xl font-semibold"
      >
        {status.stage}
      </div>
      {status.milestoneType && (
        <div className="mt-2 text-xs text-white/60">{status.milestoneType.replace(/_/g, " ")}</div>
      )}
    </div>
  );
}
