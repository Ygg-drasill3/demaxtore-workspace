import { AnimatePresence } from "framer-motion";
import type { TargetGeometry } from "../geometry";
import type { TargetTransitionMeta } from "../useTargetTransition";
import type { CardPlacement } from "../useGuideCardPosition";
import { GuideBackdropLayers } from "./GuideBackdropLayers";
import { MorphingSpotlight } from "./MorphingSpotlight";
import { GuideTargetGlow } from "./GuideTargetGlow";
import { AnimatedGuideArrow } from "./AnimatedGuideArrow";

interface Props {
  target: TargetGeometry;
  transitionMeta: TargetTransitionMeta;
  reducedMotion: boolean;
  cameraWiden: boolean;
  showSpotlight: boolean;
  cardPlacement: CardPlacement | null;
  cardHeight: number;
  showArrow: boolean;
}

export function CinematicOverlay({
  target,
  transitionMeta,
  reducedMotion,
  cameraWiden,
  showSpotlight,
  cardPlacement,
  cardHeight,
  showArrow,
}: Props) {
  return (
    <>
      <GuideBackdropLayers reducedMotion={reducedMotion} />
      <AnimatePresence>
        {showSpotlight && (
          <>
            <MorphingSpotlight
              geometry={target}
              transitionMeta={transitionMeta}
              reducedMotion={reducedMotion}
              cameraWiden={cameraWiden}
            />
            <GuideTargetGlow geometry={target} reducedMotion={reducedMotion} active />
          </>
        )}
      </AnimatePresence>
      {showArrow && cardPlacement && (
        <AnimatedGuideArrow
          target={target}
          card={cardPlacement}
          cardHeight={cardHeight}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
