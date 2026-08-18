import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";

interface Props {
  fromLabel: string;
  toLabel: string;
  reducedMotion: boolean;
}

/** Soft page-to-page continuity cue when a guide implies navigation. */
export function RouteContinuationTransition({ fromLabel, toLabel, reducedMotion }: Props) {
  return (
    <m.div
      className="flex items-center gap-2 text-[11px] font-medium text-zinc-500"
      initial={reducedMotion ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: guideDuration.fast, ease: guideEase.enter }}
      data-testid="academy-route-continuation"
    >
      <span className="text-[var(--dmx-guide-ink)]">{fromLabel}</span>
      <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
        <m.path
          d="M2 5 H22"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0.01 : guideDuration.deliberate }}
        />
        <m.path
          d="M20 2 L25 5 L20 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.25 }}
        />
      </svg>
      <span className="text-[var(--dmx-guide-accent)]">{toLabel}</span>
    </m.div>
  );
}
