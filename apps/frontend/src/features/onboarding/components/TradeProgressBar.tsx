import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeMilestoneProgress } from "@dmx/contracts/onboarding";

interface TradeProgressBarProps {
  milestones: TradeMilestoneProgress[];
  compact?: boolean;
}

export function TradeProgressBar({ milestones, compact }: TradeProgressBarProps) {
  return (
    <nav
      data-testid="trade-progress-bar"
      aria-label="Trade progress"
      className={cn(
        "flex items-center gap-1 overflow-x-auto",
        compact ? "text-xs" : "text-sm",
      )}
    >
      {milestones.map((m, i) => (
        <div key={m.key} className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-1">
            {m.status === "done" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" data-testid={`milestone-done-${m.key}`} />
            ) : m.status === "current" ? (
              <ChevronRight className="h-3.5 w-3.5 text-accent-900" data-testid={`milestone-current-${m.key}`} />
            ) : (
              <Circle className="h-3.5 w-3.5 text-zinc-300" />
            )}
            <span className={cn(
              m.status === "done" && "text-emerald-700",
              m.status === "current" && "font-medium text-accent-900",
              m.status === "pending" && "text-zinc-400",
            )}>
              {m.label}
            </span>
          </div>
          {i < milestones.length - 1 && (
            <span className="text-zinc-300 mx-1">·</span>
          )}
        </div>
      ))}
    </nav>
  );
}
