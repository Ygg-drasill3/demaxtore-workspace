import { useCallback, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface MagneticOptions {
  strength?: number;
  maxOffset?: number;
}

/**
 * Subtle cursor attraction — communicates interactivity without gimmicks.
 * Used on primary CTAs and premium cards.
 */
export function useMagnetic<T extends HTMLElement>(opts: MagneticOptions = {}) {
  const { strength = 0.22, maxOffset = 10 } = opts;
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      const x = Math.max(-maxOffset, Math.min(maxOffset, dx));
      const y = Math.max(-maxOffset, Math.min(maxOffset, dy));
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
    [reduced, strength, maxOffset],
  );

  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  }, []);

  return { ref, onMouseMove, onMouseLeave, disabled: reduced };
}
