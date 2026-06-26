import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "../hooks";

export function GuidedOnboardingCard() {
  const { data, isLoading, isError } = useOnboardingProgress();

  if (isLoading) {
    return (
      <div data-testid="guided-onboarding-loading" className="dmx-card p-6 animate-pulse h-48" />
    );
  }

  if (isError || !data) return null;

  if (data.completed && data.firstTradeCompleted) return null;

  const { nextAction, completionPercent, checklist } = data;

  return (
    <section
      data-testid="guided-onboarding-card"
      className="rounded-2xl border border-accent-900/15 bg-accent-50 p-6 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="dmx-eyebrow text-accent-900">Trade Progress</div>
          <h2 className="font-display text-xl font-semibold mt-1">{completionPercent}% Complete</h2>
        </div>
        <div className="w-full sm:w-48 h-2 bg-white rounded-full overflow-hidden border border-accent-900/10">
          <div
            data-testid="onboarding-progress-bar"
            className="h-full bg-accent-900 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {nextAction && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Next Action</div>
          <p data-testid="onboarding-next-action" className="text-sm font-medium text-ink-900 mt-1">
            {nextAction.label}
          </p>
          <p className="text-sm text-zinc-600 mt-1">{nextAction.description}</p>
          <p className="text-xs text-zinc-400 mt-1">Est. {nextAction.estimatedMinutes} min</p>
          <Link to={nextAction.href} className="inline-block mt-3">
            <Button data-testid="onboarding-action-btn" size="lg">
              {nextAction.actionLabel} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <ul data-testid="onboarding-checklist" className="mt-5 space-y-2">
        {checklist.map((item) => (
          <li key={item.step} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" data-testid={`checklist-done-${item.step}`} />
            ) : (
              <Circle className={cn("h-4 w-4 shrink-0", item.current ? "text-accent-900" : "text-zinc-300")} />
            )}
            <span className={cn(item.completed && "text-zinc-400 line-through", item.current && "font-medium text-ink-900")}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
