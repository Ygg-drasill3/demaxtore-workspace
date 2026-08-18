import { createContext, useContext, type ReactNode } from "react";
import { useGuideMotion } from "./useGuideMotion";
import type { GuideMotionAction, GuideMotionState } from "./guideMotionState";
import { useReducedMotionPreferences, type GuideMotionPreferences } from "./useReducedMotionPreferences";

interface GuideMotionContextValue {
  state: GuideMotionState;
  dispatch: React.Dispatch<GuideMotionAction>;
  prefs: GuideMotionPreferences;
}

const GuideMotionContext = createContext<GuideMotionContextValue | null>(null);

export function GuideMotionProvider({
  children,
  startAt = 0,
}: {
  children: ReactNode;
  startAt?: number;
}) {
  const [state, dispatch] = useGuideMotion(startAt);
  const prefs = useReducedMotionPreferences();
  return (
    <GuideMotionContext.Provider value={{ state, dispatch, prefs }}>
      {children}
    </GuideMotionContext.Provider>
  );
}

export function useGuideMotionContext(): GuideMotionContextValue {
  const ctx = useContext(GuideMotionContext);
  if (!ctx) throw new Error("useGuideMotionContext requires GuideMotionProvider");
  return ctx;
}
