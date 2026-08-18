import { useReducer } from "react";
import {
  createInitialGuideMotionState,
  guideMotionReducer,
  type GuideMotionState,
  type GuideMotionAction,
} from "./guideMotionState";

/** Hook wrapper around the guide motion state machine. */
export function useGuideMotion(startAt = 0): [GuideMotionState, React.Dispatch<GuideMotionAction>] {
  return useReducer(guideMotionReducer, createInitialGuideMotionState(startAt));
}
