// apps/frontend/src/features/workspace-academy/context/WorkspaceAcademyProvider.tsx
//
// Central state + orchestration for the Workspace Academy:
//   • loads personalized academy state (backend persistence)
//   • auto-launches page guides on every first eligible visit (route-by-route)
//   • Help Center is for replay / articles / restart — not required for first-time
//   • completes VIEW checklist tasks from genuine route visits
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import type { AcademyStateDTO } from "@dmx/contracts/workspace-academy";
import { academyTaskById } from "@dmx/contracts/workspace-academy";
import { academyApi } from "../lib/academy.api";
import { guideById } from "../lib/guide-registry";
import { ROUTE_TASK_TRIGGERS } from "../lib/checklist";
import { routeMatches } from "../lib/guide-registry";
import { isGuideActive, launchGuide, stopActiveGuide } from "../lib/guide-launcher";
import {
  isCbEmbedTourActive,
  launchCommodityBidCreateEmbedTour,
  stopCbEmbedTour,
} from "../lib/launch-cb-create-tour";
import type { GuideDefinition } from "../types/academy.types";
import {
  clearAutoGuideSessionCache,
  pauseJourney,
  skipGuideForSession as markGuideSkippedInSession,
} from "../orchestrator/GuideCooldown";
import {
  onAutomaticGuideFinished,
  useAutomaticPageGuide,
} from "../orchestrator/useAutomaticPageGuide";
import { journeyProgress } from "../orchestrator/buyerJourney";

const QK = ["workspace-academy", "state"] as const;

interface AcademyContextValue {
  state: AcademyStateDTO | null;
  isLoading: boolean;
  /** Launch a guide manually (Help Center / articles / replay). */
  startGuide: (guideId: string) => Promise<boolean>;
  /** Skip current-page auto guide for this browser session only. */
  skipGuideForSession: (guideId: string) => void;
  /** Pause all automatic guides for this browser session ("Exit onboarding"). */
  exitOnboardingJourney: () => void;
  completeWelcome: () => void;
  dismissWelcome: () => void;
  completeProcessOverview: () => void;
  completeTask: (taskId: string) => void;
  dismissTask: (taskId: string) => void;
  dismissChecklist: () => void;
  viewArticle: (articleId: string) => void;
  restartOnboarding: () => Promise<void>;
  refetch: () => void;
  /** Buyer journey exploration progress (guide stages). */
  journey: { done: number; total: number; pct: number };
}

const AcademyContext = createContext<AcademyContextValue | null>(null);

export function useWorkspaceAcademy(): AcademyContextValue {
  const ctx = useContext(AcademyContext);
  if (!ctx) throw new Error("useWorkspaceAcademy must be used inside WorkspaceAcademyProvider");
  return ctx;
}

export function WorkspaceAcademyProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const { t, locale } = useT();
  const { track } = useTelemetry();
  const location = useLocation();
  const queryClient = useQueryClient();
  const launchingRef = useRef(false);
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const { data: state = null, isLoading, refetch } = useQuery({
    queryKey: QK,
    queryFn: academyApi.state,
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: 1,
  });

  // After a server-side academy reset (or fresh profile), clear browser session
  // flags that would otherwise keep tours / journey hidden ("Pause guided tours").
  useEffect(() => {
    if (!state) return;
    const fresh =
      !state.checklistDismissedAt &&
      !state.welcomeDismissedAt &&
      !state.welcomeCompletedAt &&
      (state.guides?.length ?? 0) === 0;
    if (fresh) clearAutoGuideSessionCache();
  }, [state]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QK }),
    [queryClient],
  );

  /**
   * Academy progress is persisted best-effort: this provider wraps the whole app, so a
   * failure here must never break the page being guided. It must still be visible
   * though — silently discarding these rejections is what previously let the entire
   * academy backend 404 without anyone noticing.
   */
  const reportPersistFailure = useCallback(
    (operation: string, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status ?? null;
      track("academy.persist_failed", { meta: { operation, status } });
      console.warn(`[academy] ${operation} did not persist`, err);
    },
    [track],
  );

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: invalidate,
  });

  const runGuide = useCallback(
    async (guide: GuideDefinition, automatic: boolean): Promise<boolean> => {
      if (launchingRef.current || isGuideActive() || isCbEmbedTourActive()) return false;
      launchingRef.current = true;
      const routeAtStart = pathnameRef.current;
      let persistedStart = false;

      const bindCallbacks = () => ({
        onStepViewed: (i: number) => {
          if (!persistedStart) {
            persistedStart = true;
            academyApi.startGuide(guide.id, automatic, guide.version)
              .catch((e) => reportPersistFailure("startGuide", e));
            track(automatic ? "academy.guide_started" : "academy.guide_restarted", {
              meta: { guideId: guide.id, automatic, role: user?.role ?? null, locale },
            });
          }
          academyApi.progressGuide(guide.id, i)
            .catch((e) => reportPersistFailure("progressGuide", e));
          track("academy.guide_step_viewed", {
            meta: { guideId: guide.id, stepIndex: i, role: user?.role ?? null },
          });
        },
        onCompleted: () => {
          if (automatic) onAutomaticGuideFinished(guide.id, routeAtStart);
          academyApi.completeGuide(guide.id, guide.version)
            .catch((e) => reportPersistFailure("completeGuide", e))
            .finally(invalidate);
          track("academy.guide_completed", {
            meta: { guideId: guide.id, role: user?.role ?? null, automatic },
          });
        },
        onDismissed: (last: number) => {
          if (automatic) onAutomaticGuideFinished(guide.id, routeAtStart);
          academyApi.dismissGuide(guide.id, guide.version)
            .catch((e) => reportPersistFailure("dismissGuide", e))
            .finally(invalidate);
          track("academy.guide_dismissed", {
            meta: { guideId: guide.id, stepIndex: last, role: user?.role ?? null, automatic },
          });
        },
        onSkipped: (last: number) => {
          if (automatic) onAutomaticGuideFinished(guide.id, routeAtStart);
          markGuideSkippedInSession(guide.id);
          track("academy.guide_skipped", {
            meta: { guideId: guide.id, stepIndex: last, role: user?.role ?? null, automatic },
          });
        },
      });

      try {
        // Create-auction form lives in CommodityBid iframe — field tour runs there.
        if (guide.id === "buyer-commoditybid-create-v1") {
          return await launchCommodityBidCreateEmbedTour(bindCallbacks());
        }
        return await launchGuide(guide, t, bindCallbacks(), 0, { showIntro: automatic });
      } finally {
        launchingRef.current = false;
      }
    },
    [t, track, user?.role, locale, invalidate, reportPersistFailure],
  );

  const startGuide = useCallback(
    async (guideId: string) => {
      const guide = guideById(guideId);
      if (!guide || !user || !guide.roles.includes(user.role)) return false;
      return runGuide(guide, false);
    },
    [runGuide, user],
  );

  const runAutomaticGuide = useCallback(
    (guide: GuideDefinition) => runGuide(guide, true),
    [runGuide],
  );

  // Automatic page-by-page guides (core UX) — Help Center not required.
  useAutomaticPageGuide({
    role: user?.role,
    state,
    pathname: location.pathname,
    runAutomaticGuide,
  });

  // Stop running guide only on real route changes (never on StrictMode remount).
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;
    stopActiveGuide({ silent: true });
    stopCbEmbedTour();
  }, [location.pathname]);

  // ── Route-visit checklist triggers (real navigation events) ────────────────
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || !state) return;
    for (const trigger of ROUTE_TASK_TRIGGERS) {
      if (!routeMatches(trigger.pattern, location.pathname)) continue;
      for (const taskId of trigger.tasks) {
        if (firedRef.current.has(taskId)) continue;
        const existing = state.tasks.find((x) => x.taskId === taskId);
        if (existing?.status === "COMPLETED") continue;
        const def = academyTaskById(taskId);
        if (!def?.roles.includes(user.role as never)) continue;
        firedRef.current.add(taskId);
        academyApi.completeTask(taskId, "route_visit")
          .then(() => {
            track("academy.checklist_task_completed", { meta: { taskId, role: user.role } });
            invalidate();
          })
          .catch((e) => reportPersistFailure("completeTask", e));
      }
    }
  }, [user, state, location.pathname, track, invalidate, reportPersistFailure]);

  const journey = useMemo(() => journeyProgress(state), [state]);

  const value = useMemo<AcademyContextValue>(() => ({
    state,
    isLoading,
    startGuide,
    skipGuideForSession: (guideId: string) => {
      markGuideSkippedInSession(guideId);
      track("academy.guide_skipped", { meta: { guideId, role: user?.role ?? null } });
    },
    exitOnboardingJourney: () => {
      pauseJourney();
      stopActiveGuide();
      track("academy.checklist_dismissed", { meta: { role: user?.role ?? null, exitJourney: true } });
    },
    completeWelcome: () => {
      mutate.mutate(() => academyApi.completeWelcome(locale));
      track("academy.welcome_completed", { meta: { role: user?.role ?? null, locale } });
    },
    dismissWelcome: () => {
      mutate.mutate(() => academyApi.dismissWelcome());
      track("academy.welcome_dismissed", { meta: { role: user?.role ?? null } });
    },
    completeProcessOverview: () => {
      mutate.mutate(() => academyApi.completeProcessOverview());
      track("academy.process_overview_completed", { meta: { role: user?.role ?? null } });
    },
    completeTask: (taskId) => mutate.mutate(() => academyApi.completeTask(taskId)),
    dismissTask: (taskId) => mutate.mutate(() => academyApi.dismissTask(taskId)),
    dismissChecklist: () => {
      mutate.mutate(() => academyApi.dismissChecklist());
      track("academy.checklist_dismissed", { meta: { role: user?.role ?? null } });
    },
    viewArticle: (articleId) => {
      academyApi.viewArticle(articleId)
        .catch((e) => reportPersistFailure("viewArticle", e))
        .then(invalidate);
      track("academy.article_viewed", { meta: { articleId, role: user?.role ?? null, locale } });
    },
    restartOnboarding: async () => {
      await academyApi.reset();
      clearAutoGuideSessionCache();
      firedRef.current.clear();
      invalidate();
    },
    refetch: () => void refetch(),
    journey,
  }), [state, isLoading, startGuide, mutate, locale, track, user?.role, invalidate, refetch, journey,
       reportPersistFailure]);

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>;
}
