import type { Transition } from "framer-motion";
import { guideDuration, guideEase } from "./motionTokens";

/** Soft floating surfaces — near-zero bounce. */
export const softSpring = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
  bounce: 0,
} as const satisfies Transition;

/** Card + spotlight morph between steps. */
export const guidedSpring = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.85,
  bounce: 0,
} as const satisfies Transition;

/** Slow “camera” feel for large spotlight moves. */
export const cameraSpring = {
  type: "spring",
  stiffness: 180,
  damping: 26,
  mass: 1.1,
  bounce: 0,
} as const satisfies Transition;

export const tweenEnter: Transition = {
  duration: guideDuration.deliberate,
  ease: guideEase.enter,
};

export const tweenExit: Transition = {
  duration: guideDuration.fast,
  ease: guideEase.exit,
};

export const tweenCinematic: Transition = {
  duration: guideDuration.cinematic,
  ease: guideEase.standard,
};

export const tweenContent: Transition = {
  duration: 0.22,
  ease: guideEase.soft,
};

export const reducedTween: Transition = {
  duration: 0.01,
};
