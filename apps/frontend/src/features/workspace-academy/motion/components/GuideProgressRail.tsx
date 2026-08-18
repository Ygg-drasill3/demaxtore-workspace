import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";

interface Props {
  current: number;
  total: number;
  reducedMotion: boolean;
}

export function GuideProgressRail({ current, total, reducedMotion }: Props) {
  const safeTotal = Math.max(total, 1);
  const idx = Math.min(Math.max(current, 0), safeTotal - 1);

  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {Array.from({ length: safeTotal }, (_, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div
              key={i}
              className="h-1 flex-1 rounded-full bg-zinc-200/80 overflow-hidden"
            >
              <m.div
                className="h-full rounded-full origin-left"
                style={{
                  background: active || done
                    ? "linear-gradient(90deg,#3949ab,#1a237e)"
                    : "transparent",
                }}
                initial={false}
                animate={{
                  scaleX: done || active ? 1 : 0,
                  opacity: done || active ? 1 : 0,
                }}
                transition={{
                  duration: reducedMotion ? 0.01 : guideDuration.normal,
                  ease: guideEase.standard,
                }}
              />
            </div>
          );
        })}
      </div>
      <span className="text-[11px] font-medium text-zinc-400 tabular-nums shrink-0">
        {idx + 1} / {safeTotal}
      </span>
    </div>
  );
}
