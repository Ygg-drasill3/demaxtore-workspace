// Mounted conceptually via WorkspaceAcademyProvider → useAutomaticPageGuide.
// This module re-exports the orchestrator surface for discoverability.
export { useAutomaticPageGuide, onAutomaticGuideFinished } from "./useAutomaticPageGuide";
export {
  evaluateAutoGuideLaunch,
  isGuideAutoEligible,
  selectAutoGuide,
  pageIsBlocked,
  pageHasUnsavedForm,
} from "./guideEligibility";
export {
  AUTO_GUIDE_COOLDOWN_MS,
  clearAutoGuideSessionCache,
  isAutoGuideCooldownClear,
  isJourneyPaused,
  markAutoGuideEnded,
  pauseJourney,
  resumeJourney,
  skipGuideForSession,
} from "./GuideCooldown";
export { BUYER_JOURNEY_ID, BUYER_JOURNEY_STAGES, journeyProgress } from "./buyerJourney";
