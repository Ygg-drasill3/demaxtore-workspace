export type GuideMotionPhase =
  | "IDLE"
  | "INTRO"
  | "LOCATING_TARGET"
  | "SCROLLING"
  | "MORPHING_SPOTLIGHT"
  | "ENTERING_CARD"
  | "ACTIVE"
  | "TRANSITIONING_CONTENT"
  | "PAUSED"
  | "EXITING"
  | "COMPLETED";

export type GuideFinishReason = "completed" | "dismissed" | "skipped";

export interface GuideMotionState {
  phase: GuideMotionPhase;
  stepIndex: number;
  /** +1 next / -1 back — drives content transition direction. */
  contentDir: 1 | -1;
  showIntro: boolean;
  finishReason: GuideFinishReason | null;
}

export type GuideMotionAction =
  | { type: "START"; withIntro: boolean }
  | { type: "INTRO_DONE" }
  | { type: "LOCATING" }
  | { type: "SCROLL_START" }
  | { type: "SCROLL_DONE" }
  | { type: "MORPH_START" }
  | { type: "CARD_ENTER" }
  | { type: "ACTIVATED" }
  | { type: "STEP_CHANGE"; index: number; dir: 1 | -1 }
  | { type: "CONTENT_SETTLED" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "EXIT"; reason: GuideFinishReason }
  | { type: "COMPLETED" };

export function createInitialGuideMotionState(startAt: number): GuideMotionState {
  return {
    phase: "IDLE",
    stepIndex: startAt,
    contentDir: 1,
    showIntro: false,
    finishReason: null,
  };
}

export function guideMotionReducer(
  state: GuideMotionState,
  action: GuideMotionAction,
): GuideMotionState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: action.withIntro ? "INTRO" : "LOCATING_TARGET",
        showIntro: action.withIntro,
        finishReason: null,
      };
    case "INTRO_DONE":
      return { ...state, phase: "LOCATING_TARGET", showIntro: false };
    case "LOCATING":
      return { ...state, phase: "LOCATING_TARGET" };
    case "SCROLL_START":
      return { ...state, phase: "SCROLLING" };
    case "SCROLL_DONE":
      return { ...state, phase: "MORPHING_SPOTLIGHT" };
    case "MORPH_START":
      return { ...state, phase: "MORPHING_SPOTLIGHT" };
    case "CARD_ENTER":
      return { ...state, phase: "ENTERING_CARD" };
    case "ACTIVATED":
      return { ...state, phase: "ACTIVE" };
    case "STEP_CHANGE":
      return {
        ...state,
        phase: "TRANSITIONING_CONTENT",
        stepIndex: action.index,
        contentDir: action.dir,
      };
    case "CONTENT_SETTLED":
      return { ...state, phase: "ACTIVE" };
    case "PAUSE":
      return { ...state, phase: "PAUSED" };
    case "RESUME":
      return { ...state, phase: "ACTIVE" };
    case "EXIT":
      return { ...state, phase: "EXITING", finishReason: action.reason };
    case "COMPLETED":
      return { ...state, phase: "COMPLETED" };
    default:
      return state;
  }
}
