import type { TradeTimelineNextMilestone } from "@dmx/contracts/trade-timeline";

interface NextMilestoneCardProps {
  milestone: TradeTimelineNextMilestone | null;
}

export function NextMilestoneCard({ milestone }: NextMilestoneCardProps) {
  if (!milestone) {
    return (
      <div
        data-testid="trade-next-milestone"
        className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5"
      >
        <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-700">Next Milestone</div>
        <div className="mt-2 text-sm font-medium text-emerald-900">All milestones complete</div>
      </div>
    );
  }

  return (
    <div
      data-testid="trade-next-milestone"
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5"
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Next Milestone</div>
      <div data-testid="trade-next-milestone-title" className="mt-2 font-medium text-ink-900">
        {milestone.title}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500">Expected</dt>
          <dd data-testid="trade-next-milestone-date">
            {milestone.estimatedDate
              ? new Date(milestone.estimatedDate).toLocaleDateString()
              : "TBD"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Responsible</dt>
          <dd data-testid="trade-next-milestone-party">{milestone.responsibleParty ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
