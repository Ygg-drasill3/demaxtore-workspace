/**
 * Workspace Academy guide motion tokens.
 * Durations in seconds — Framer Motion convention.
 */
export const guideDuration = {
  instant: 0.12,
  fast: 0.18,
  normal: 0.28,
  deliberate: 0.42,
  cinematic: 0.65,
  intro: 1.15,
} as const;

export const guideEase = {
  standard: [0.22, 1, 0.36, 1] as const,
  enter: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  soft: [0.25, 0.8, 0.25, 1] as const,
};

/** Spotlight padding around the measured target (px). */
export const SPOTLIGHT_PADDING = 10;

/** Hide connector when card edge is closer than this (px). */
export const ARROW_HIDE_DISTANCE = 28;

/** Sticky / chrome clearances (px). */
export const VIEWPORT_INSETS = {
  top: 64,
  bottomDesktop: 24,
  bottomMobile: 88,
  side: 16,
} as const;

export const CARD = {
  width: 328,
  maxWidth: 340,
  minWidth: 280,
  gap: 18,
  mobileMaxHeightRatio: 0.48,
} as const;

export const Z_GUIDE = {
  backdrop: 999990,
  spotlight: 999991,
  arrow: 999992,
  card: 999993,
  intro: 999994,
} as const;
