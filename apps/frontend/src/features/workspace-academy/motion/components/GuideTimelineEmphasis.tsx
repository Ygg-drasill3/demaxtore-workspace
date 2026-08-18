import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";

export interface TimelineStage {
  id: string;
  label: string;
  status: "done" | "current" | "future";
}

interface Props {
  stages: TimelineStage[];
  reducedMotion: boolean;
}

/**
 * One-shot educational timeline emphasis — does not mutate real status.
 * Plays once when mounted; no continuous loop.
 */
export function GuideTimelineEmphasis({ stages, reducedMotion }: Props) {
  return (
    <div className="flex items-center gap-0 w-full" data-testid="academy-timeline-emphasis" aria-hidden="true">
      {stages.map((stage, i) => {
        const done = stage.status === "done";
        const current = stage.status === "current";
        return (
          <div key={stage.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <m.span
                className={
                  current
                    ? "h-2.5 w-2.5 rounded-full bg-[var(--dmx-guide-accent)]"
                    : done
                      ? "h-2 w-2 rounded-full bg-[var(--dmx-guide-accent)]/70"
                      : "h-2 w-2 rounded-full bg-zinc-300"
                }
                initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: guideDuration.fast,
                  delay: reducedMotion ? 0 : i * 0.08,
                  ease: guideEase.enter,
                }}
              />
              <span className="text-[9px] text-zinc-400 truncate max-w-[4.5rem] text-center">
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <m.div
                className="h-px flex-1 mx-1 origin-left bg-zinc-200"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: reducedMotion ? 0.01 : guideDuration.normal,
                  delay: reducedMotion ? 0 : 0.05 + i * 0.08,
                }}
                style={{
                  background: done || current ? "rgba(26,35,126,0.35)" : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
