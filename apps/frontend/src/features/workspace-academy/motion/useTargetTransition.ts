import { useEffect, useRef, useState } from "react";
import { distanceBetween, type TargetGeometry } from "./geometry";
import { cameraSpring, guidedSpring, reducedTween } from "./motionPresets";

export interface TargetTransitionMeta {
  /** Large jump — use camera spring + scroll. */
  distant: boolean;
  distance: number;
  transition: typeof guidedSpring | typeof cameraSpring | typeof reducedTween;
}

const DISTANT_PX = 220;

/**
 * Chooses spring preset based on how far the spotlight must travel.
 */
export function useTargetTransition(
  geo: TargetGeometry,
  reducedMotion: boolean,
): TargetTransitionMeta {
  const prev = useRef<TargetGeometry | null>(null);
  const [meta, setMeta] = useState<TargetTransitionMeta>({
    distant: false,
    distance: 0,
    transition: guidedSpring,
  });

  useEffect(() => {
    if (reducedMotion) {
      setMeta({ distant: false, distance: 0, transition: reducedTween });
      prev.current = geo;
      return;
    }
    const last = prev.current;
    prev.current = geo;
    if (!last || !last.visible) {
      setMeta({ distant: false, distance: 0, transition: guidedSpring });
      return;
    }
    const distance = distanceBetween(last, geo);
    const distant = distance > DISTANT_PX;
    setMeta({
      distant,
      distance,
      transition: distant ? cameraSpring : guidedSpring,
    });
  }, [geo.x, geo.y, geo.width, geo.height, reducedMotion]);

  return meta;
}
