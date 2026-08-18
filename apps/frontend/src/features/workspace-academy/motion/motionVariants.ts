import type { Variants } from "framer-motion";
import { guideDuration, guideEase } from "./motionTokens";
import { softSpring, tweenContent, tweenEnter } from "./motionPresets";

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: guideDuration.cinematic, ease: guideEase.enter },
  },
  exit: {
    opacity: 0,
    transition: { duration: guideDuration.normal, ease: guideEase.exit },
  },
};

export const introLabelVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: softSpring,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: guideDuration.fast, ease: guideEase.exit },
  },
};

export const cardShellVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: softSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: { duration: guideDuration.fast, ease: guideEase.exit },
  },
};

/** Directional content swap — positive = next, negative = back. */
export function contentSwapVariants(dir: 1 | -1, rtl: boolean): Variants {
  const sign = rtl ? -dir : dir;
  return {
    initial: { opacity: 0, y: 8 * sign },
    animate: {
      opacity: 1,
      y: 0,
      transition: { ...tweenContent, delay: 0.04 },
    },
    exit: {
      opacity: 0,
      y: -6 * sign,
      transition: { duration: 0.16, ease: guideEase.exit },
    },
  };
}

export const staggerCardChildren: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
};

export const cardChildVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenEnter,
  },
};

export const sheetVariants: Variants = {
  hidden: { y: "108%", opacity: 0.85 },
  visible: {
    y: 0,
    opacity: 1,
    transition: softSpring,
  },
  exit: {
    y: "108%",
    opacity: 0.9,
    transition: { duration: guideDuration.normal, ease: guideEase.exit },
  },
};
