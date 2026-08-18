import { m } from "framer-motion";
import type { TargetGeometry } from "../geometry";
import type { TargetTransitionMeta } from "../useTargetTransition";
import { reducedTween } from "../motionPresets";
import { Z_GUIDE } from "../motionTokens";

interface Props {
  geometry: TargetGeometry;
  transitionMeta: TargetTransitionMeta;
  reducedMotion: boolean;
  cameraWiden?: boolean;
}

/**
 * Dim overlay with a clear hole — HTML boxes only (no SVG motion).
 * Avoids LazyMotion/domAnimation crashes from m.rect.
 */
export function MorphingSpotlight({
  geometry,
  transitionMeta,
  reducedMotion,
  cameraWiden = false,
}: Props) {
  const pad = cameraWiden && transitionMeta.distant ? 28 : 0;
  const x = Math.max(0, geometry.x - pad / 2);
  const y = Math.max(0, geometry.y - pad / 2);
  const width = Math.max(24, geometry.width + pad);
  const height = Math.max(24, geometry.height + pad);
  const radius = geometry.radius + (cameraWiden ? 4 : 0);
  const transition = reducedMotion ? reducedTween : transitionMeta.transition;
  const dim = "rgba(11, 16, 32, 0.55)";

  return (
    <div className="absolute inset-0" style={{ zIndex: Z_GUIDE.spotlight }} aria-hidden="true">
      {/* Four panels around the hole */}
      <m.div
        className="absolute left-0 right-0 top-0"
        initial={false}
        animate={{ height: Math.max(0, y) }}
        transition={transition}
        style={{ background: dim }}
      />
      <m.div
        className="absolute left-0 right-0 bottom-0"
        initial={false}
        animate={{ top: y + height }}
        transition={transition}
        style={{ background: dim }}
      />
      <m.div
        className="absolute left-0"
        initial={false}
        animate={{ top: y, height, width: Math.max(0, x) }}
        transition={transition}
        style={{ background: dim }}
      />
      <m.div
        className="absolute"
        initial={false}
        animate={{ top: y, left: x + width, height, right: 0 }}
        transition={transition}
        style={{ background: dim }}
      />

      {/* Clear ring around target */}
      <m.div
        className="absolute pointer-events-none"
        initial={false}
        animate={{
          x,
          y,
          width,
          height,
          borderRadius: radius,
        }}
        transition={transition}
        style={{
          boxShadow:
            "0 0 0 2px #ffffff, 0 0 0 3.5px rgba(26, 35, 126, 0.55), 0 16px 40px -12px rgba(11, 16, 32, 0.4)",
        }}
      />
    </div>
  );
}
