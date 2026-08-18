import { m } from "framer-motion";
import { backdropVariants } from "../motionVariants";
import { reducedTween } from "../motionPresets";

interface Props {
  reducedMotion: boolean;
}

/**
 * Lightweight vignette only — dim + cutout live in MorphingSpotlight.
 * No full-viewport blur (that made the UI look like frosted glass).
 */
export function GuideBackdropLayers({ reducedMotion }: Props) {
  return (
    <m.div
      className="absolute inset-0"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      aria-hidden="true"
    >
      <m.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reducedMotion ? reducedTween : { duration: 0.45 }}
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(11,16,32,0.18) 100%)",
        }}
      />
    </m.div>
  );
}
