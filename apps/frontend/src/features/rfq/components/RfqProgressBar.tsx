// apps/frontend/src/features/rfq/components/RfqProgressBar.tsx
//
// Sprint 2.5 — buyer-readable 7-step storyline (storyline, not FSM).
// Sub-state pill renders below the current step bubble for bundled steps.
// Terminal states show a humanised banner instead of the rail.
//
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORYLINE_STEPS, STATE_TO_STORYLINE_STEP, storylineSubLabel, terminalReason } from "../lib/state-labels";
import type { RfqState } from "@dmx/contracts/rfq.fsm";

interface Props {
  state: string;
  /** Data the sub-state pill needs. Optional; rendered only if present. */
  meta?: {
    invited?: number;
    quoted?:  number;
    assignedSuppliers?:    number;
    proformaSlaDaysLeft?:  number;
    terminalReason?:       string;
  };
  /** Rendered directly below the storyline (e.g. admin workflow controls). */
  belowStoryline?: ReactNode;
}

export function RfqProgressBar({ state, meta, belowStoryline }: Props) {
  const rfqState = state as RfqState;
  const stepIdx = STATE_TO_STORYLINE_STEP[rfqState];
  const reason  = terminalReason(rfqState);

  if (stepIdx < 0 || reason) {
    return (
      <div data-testid="rfq-progress-bar-closed" className="dmx-card p-5 sm:p-6 animate-fade-in bg-paper-50/60">
        <div className="text-sm text-zinc-700">
          <span className="text-zinc-900 font-medium">{reason ?? "Closed."}</span>
          {meta?.terminalReason && (
            <span className="text-zinc-500"> {meta.terminalReason}</span>
          )}
        </div>
        {belowStoryline}
      </div>
    );
  }

  const subLabel = storylineSubLabel({
    state:    rfqState,
    invited:  meta?.invited  ?? 0,
    quoted:   meta?.quoted   ?? 0,
    assignedSuppliers:   meta?.assignedSuppliers,
    proformaSlaDaysLeft: meta?.proformaSlaDaysLeft,
  });

  return (
    <div data-testid="rfq-progress-bar" data-guide="rfq-story-bar" className="dmx-card p-4 sm:p-5">
      <ol className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto dmx-thin-scroll">
        {STORYLINE_STEPS.map((s, idx) => {
          const done    = idx < stepIdx;
          const current = idx === stepIdx;
          return (
            <li key={s.key} data-testid={`storyline-${s.key}`}
                data-state={done ? "done" : current ? "current" : "upcoming"}
                className="flex-1 min-w-[88px] flex flex-col items-center">
              <div className="flex items-center w-full">
                <div className={cn("h-px flex-1",
                  idx === 0 ? "opacity-0" : done ? "bg-accent-900" : "bg-paper-200")} />
                <div className={cn(
                  "h-6 w-6 rounded-full grid place-items-center text-[10px] font-semibold shrink-0 mx-1",
                  done    && "bg-accent-900 text-white",
                  current && "bg-white text-accent-900 ring-2 ring-accent-900 animate-pulse",
                  !done && !current && "bg-paper-100 text-zinc-400 ring-1 ring-paper-200",
                )}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                </div>
                <div className={cn("h-px flex-1",
                  idx === STORYLINE_STEPS.length - 1 ? "opacity-0"
                  : done && idx + 1 <= stepIdx ? "bg-accent-900" : "bg-paper-200")} />
              </div>
              <div className={cn("text-[10px] sm:text-[11px] text-center mt-1.5 leading-tight",
                current ? "text-ink-900 font-medium" : done ? "text-zinc-600" : "text-zinc-400")}>
                {s.label}
              </div>
            </li>
          );
        })}
      </ol>

      {subLabel && (
        <div className="mt-3 flex justify-center">
          <span data-testid="storyline-sub-pill"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1
                           rounded-full bg-accent-50 text-accent-900 border border-accent-900/15">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-900" />
            {subLabel}
          </span>
        </div>
      )}

      {belowStoryline}
    </div>
  );
}
