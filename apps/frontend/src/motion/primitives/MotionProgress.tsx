import { m } from "framer-motion";
import { springGentle } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

/** Animated progress — bars grow with spring physics for status indicators. */
export function MotionProgress({ value, max = 100, className, barClassName }: Props) {
  const reduced = useReducedMotion();
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className ?? "h-1.5 w-full rounded-full bg-paper-200 overflow-hidden"}>
      {reduced ? (
        <div className={barClassName ?? "h-full rounded-full bg-accent-900"} style={{ width: `${pct}%` }} />
      ) : (
        <m.div
          className={barClassName ?? "h-full rounded-full bg-accent-900 origin-left"}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={springGentle}
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
