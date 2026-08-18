import { m } from "framer-motion";
import type { TargetGeometry } from "../geometry";
import { guidedSpring, reducedTween } from "../motionPresets";

interface Props {
  geometry: TargetGeometry;
  reducedMotion: boolean;
  active: boolean;
}

/** Soft outer halo only — never covers target content. */
export function GuideTargetGlow({ geometry, reducedMotion, active }: Props) {
  if (!active || !geometry.visible) return null;

  return (
    <m.div
      className="absolute pointer-events-none"
      initial={false}
      animate={{
        x: geometry.x - 4,
        y: geometry.y - 4,
        width: geometry.width + 8,
        height: geometry.height + 8,
        borderRadius: geometry.radius + 4,
        opacity: 1,
      }}
      transition={reducedMotion ? reducedTween : guidedSpring}
      style={{
        boxShadow: "0 0 0 8px rgba(26, 35, 126, 0.08)",
        background: "transparent",
      }}
      aria-hidden="true"
    />
  );
}
