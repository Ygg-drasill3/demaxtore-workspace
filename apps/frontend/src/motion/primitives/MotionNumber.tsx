import { useEffect, useRef, useState } from "react";
import { m, useSpring, useTransform } from "framer-motion";
import { springGentle } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  value: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Animated metric counter — live dashboard numbers interpolate smoothly.
 */
export function MotionNumber({ value, className, decimals = 0, prefix = "", suffix = "" }: Props) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, springGentle);
  const display = useTransform(spring, (v) =>
    `${prefix}${v.toFixed(decimals)}${suffix}`,
  );
  const [text, setText] = useState(`${prefix}${value.toFixed(decimals)}${suffix}`);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    spring.set(value);
    if (reduced) {
      setText(`${prefix}${value.toFixed(decimals)}${suffix}`);
      return;
    }
    unsub.current?.();
    unsub.current = display.on("change", (v) => setText(v));
    return () => unsub.current?.();
  }, [value, spring, display, reduced, prefix, suffix, decimals]);

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return <m.span className={className}>{text}</m.span>;
}
