/**
 * DeMaxtore Motion Design System — spring physics & timing tokens.
 * Inspired by Linear / Stripe / Apple HIG motion curves.
 */
import type { Transition, Variants } from "framer-motion";

/** Primary spring — UI surfaces, cards, modals */
export const springSnappy = { type: "spring", stiffness: 420, damping: 32, mass: 0.85 } as const;
/** Soft spring — page transitions, large panels */
export const springGentle = { type: "spring", stiffness: 260, damping: 28, mass: 1 } as const;
/** Micro spring — buttons, toggles */
export const springMicro  = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const;
/** Toast / notification stack */
export const springToast  = { type: "spring", stiffness: 380, damping: 26, mass: 0.9 } as const;

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOut   = [0.65, 0, 0.35, 1] as const;

export const duration = {
  instant: 0.12,
  fast:    0.22,
  normal:  0.38,
  slow:    0.55,
  reveal:  0.72,
} as const;

/** Route enter — opacity only; no blur/scale (keeps navigation crisp). */
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.fast, ease: easeOutExpo },
  },
};

/** Legacy export — enter-only pages no longer use exit springs. */
export const pageTransition: Transition = { duration: duration.fast, ease: easeOutExpo };

export const fadeUpVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...springGentle, delay: i * 0.06 },
  }),
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const modalBackdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.fast } },
  exit:    { opacity: 0, transition: { duration: duration.instant } },
};

export const modalPanelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: springSnappy },
  exit:    { opacity: 0, scale: 0.98, y: 8, transition: { duration: duration.fast } },
};

export const drawerPanelVariants: Variants = {
  hidden:  { x: "100%" },
  visible: { x: 0, transition: springSnappy },
  exit:    { x: "100%", transition: { ...springSnappy, damping: 36 } },
};

/** Left-anchored nav drawer (mobile sidebar). */
export const leftDrawerPanelVariants: Variants = {
  hidden:  { x: "-100%" },
  visible: { x: 0, transition: springSnappy },
  exit:    { x: "-100%", transition: { ...springSnappy, damping: 36 } },
};

/** Nav group accordion expand/collapse. */
export const navAccordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { ...springSnappy, opacity: { duration: duration.fast } } },
  expanded:  { height: "auto", opacity: 1, transition: springSnappy },
};

export const toastVariants: Variants = {
  initial: { opacity: 0, y: -20, scale: 0.94, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0,   scale: 1,     filter: "blur(0px)", transition: springToast },
  exit:    { opacity: 0, y: -12, scale: 0.96,  transition: { duration: duration.fast } },
};

export const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.01 } },
  exit:    { opacity: 0, transition: { duration: 0.01 } },
};
