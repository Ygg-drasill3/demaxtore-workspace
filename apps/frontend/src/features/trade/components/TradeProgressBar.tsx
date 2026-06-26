import { cn } from "@/lib/utils";

interface TradeProgressBarProps {
  progressPercent: number;
  className?: string;
}

export function TradeProgressBar({ progressPercent, className }: TradeProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progressPercent));

  return (
    <div data-testid="trade-progress-bar" className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-zinc-500">Trade Progress</span>
        <span
          data-testid="trade-progress-percent"
          className="font-semibold tabular-nums text-ink-900"
        >
          {clamped}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          data-testid="trade-progress-fill"
          className="h-full rounded-full bg-gradient-to-r from-accent-700 to-accent-500 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
