import { CheckCircle2, Circle } from "lucide-react";
import {
  CommodityBidOnboardingStep,
  COMMODITYBID_STEP_LABELS,
  COMMODITYBID_STEP_DESCRIPTIONS,
  commodityBidChecklistProgress,
} from "@dmx/contracts/commoditybid-learning";
import { cn } from "@/lib/utils";

/** First Trade Success checklist for CommodityBid workspaces (content only). */
export function CommodityBidChecklistPanel({ state }: { state: string }) {
  const completed = new Set(commodityBidChecklistProgress(state));
  const current = CommodityBidOnboardingStep.find((s) => !completed.has(s)) ?? null;

  return (
    <section data-testid="cb-first-trade-checklist" className="dmx-card p-4">
      <div className="dmx-eyebrow text-zinc-500">First Trade — CommodityBid</div>
      <h2 className="font-display text-lg font-semibold mt-1">Reverse auction progress</h2>
      <p className="text-sm text-zinc-600 mt-1">
        Scheduled auction flow: create → invite → live bidding → automatic winner → buyer approval → order.
      </p>
      <ul className="mt-4 space-y-2">
        {CommodityBidOnboardingStep.map((step) => {
          const done = completed.has(step);
          const isCurrent = step === current;
          return (
            <li key={step} data-testid={`cb-checklist-${step}`} className="flex items-start gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className={cn("h-4 w-4 shrink-0 mt-0.5", isCurrent ? "text-accent-900" : "text-zinc-300")} />
              )}
              <div>
                <span className={cn(done && "text-zinc-400 line-through", isCurrent && "font-medium text-ink-900")}>
                  {COMMODITYBID_STEP_LABELS[step]}
                </span>
                {isCurrent && (
                  <p className="text-xs text-zinc-500 mt-0.5">{COMMODITYBID_STEP_DESCRIPTIONS[step]}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
