import type { TradePipelineStage } from "@dmx/contracts/import-control-tower";
import { ChevronDown } from "lucide-react";

export function TradePipelineWidget({ stages }: { stages: TradePipelineStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <section data-testid="ict-pipeline" className="dmx-card p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-4">Trade Status Overview</h2>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-2">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex sm:flex-col items-center gap-2 sm:flex-1 min-w-0">
            <div className="flex-1 sm:w-full">
              <div
                data-testid={`ict-pipeline-${stage.key}`}
                className="rounded-lg bg-accent-900/90 text-white flex items-end justify-center min-h-[48px] sm:min-h-[120px] transition-all"
                style={{ height: `${Math.max(24, (stage.count / max) * 120)}px` }}
              >
                <span className="text-lg font-semibold tabular-nums pb-2">{stage.count}</span>
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500 text-center truncate">
                {stage.label}
              </div>
            </div>
            {i < stages.length - 1 && (
              <ChevronDown className="h-4 w-4 text-zinc-300 shrink-0 sm:hidden rotate-[-90deg]" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
