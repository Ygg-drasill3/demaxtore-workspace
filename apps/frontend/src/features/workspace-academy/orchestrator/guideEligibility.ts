// Central eligibility for automatic page guides.
// Pure functions — safe to unit-test without DOM (pass document stub).
import type { Role } from "@dmx/contracts/auth";
import type { AcademyGuideProgressDTO, AcademyStateDTO } from "@dmx/contracts/workspace-academy";
import type { GuideDefinition } from "../types/academy.types";
import { guidesForRole, routeMatches } from "../lib/guide-registry";
import {
  isAutoGuideCooldownClear,
  isGuideSkippedThisSession,
  isJourneyPaused,
} from "./GuideCooldown";

export type AutoGuideBlockReason =
  | "not-authenticated"
  | "state-loading"
  | "welcome-pending"
  | "journey-paused"
  | "cooldown"
  | "guide-active"
  | "page-blocked"
  | "form-dirty"
  | "no-candidates"
  | "targets-missing";

export interface AutoGuideEvalContext {
  role: Role | null | undefined;
  state: AcademyStateDTO | null;
  pathname: string;
  guideActive: boolean;
  pageBlocked: boolean;
  formDirty?: boolean;
  /** Injected for tests; defaults to document. */
  dom?: ParentNode | null;
}

export interface AutoGuideDecision {
  guide: GuideDefinition | null;
  blocked: AutoGuideBlockReason | null;
  candidates: GuideDefinition[];
}

/** True when an element is present and not screen-reader-only / display:none. */
export function isGuideTargetVisible(selector: string, root: ParentNode = document): boolean {
  const el = root.querySelector(selector);
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true" && el.classList.contains("sr-only")) return false;
  if (el.classList.contains("sr-only")) return false;
  const style = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  // Zero-size sr-only patterns
  if (el.offsetParent === null && style?.position !== "fixed") {
    // fixed elements can have null offsetParent — allow them
    if (style?.position !== "fixed" && style?.position !== "sticky") {
      // still allow if it has dimensions in getBoundingClientRect
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 && rect.height < 2) return false;
    }
  }
  return true;
}

function progressOf(state: AcademyStateDTO, guideId: string): AcademyGuideProgressDTO | undefined {
  return state.guides.find((p) => p.guideId === guideId);
}

/** Persisted + session rules for a single guide (ignores page blockers / cooldown). */
export function isGuideAutoEligible(
  guide: GuideDefinition,
  state: AcademyStateDTO,
  pathname: string,
  root: ParentNode = document,
): boolean {
  if (!guide.automatic) return false;
  if (!routeMatches(guide.routeMatcher, pathname)) return false;
  if (isGuideSkippedThisSession(guide.id)) return false;

  const progress = progressOf(state, guide.id);
  if (progress) {
    const versionCaughtUp = progress.guideVersion >= guide.version;
    // Only permanent end-states block auto-launch. STARTED must remain eligible:
    // route changes destroy the tour silently and used to leave displayCount=1,
    // which permanently hid Next/Back on the next visit.
    if ((progress.status === "COMPLETED" || progress.status === "DISMISSED") && versionCaughtUp) {
      return false;
    }
  }

  for (const pre of guide.prerequisiteGuideIds ?? []) {
    const preProgress = progressOf(state, pre);
    // Unlock after the base guide was seen (completed or permanently dismissed).
    if (
      !preProgress ||
      (preProgress.status !== "COMPLETED" &&
        preProgress.status !== "DISMISSED" &&
        preProgress.displayCount < 1)
    ) {
      return false;
    }
  }

  // Unlock guides wait for their feature panel to be mounted & visible
  const required = guide.requireVisibleSelectors ?? [];
  if (required.length > 0) {
    const anyVisible = required.some((sel) => isGuideTargetVisible(sel, root));
    if (!anyVisible) return false;
  }

  return true;
}

/**
 * Pick the single highest-priority eligible guide for the current route.
 * Feature unlocks (quotation, proforma, …) outrank the base workspace tour
 * once their panels are visible AND the base guide is already done — or when
 * the unlock guide has higher priority and its selectors are present.
 */
export function selectAutoGuide(
  role: Role,
  state: AcademyStateDTO,
  pathname: string,
  root: ParentNode = document,
): GuideDefinition[] {
  const list = guidesForRole(role)
    .filter((g) => isGuideAutoEligible(g, state, pathname, root))
    .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  return list;
}

export function evaluateAutoGuideLaunch(ctx: AutoGuideEvalContext): AutoGuideDecision {
  if (!ctx.role) return { guide: null, blocked: "not-authenticated", candidates: [] };
  if (!ctx.state) return { guide: null, blocked: "state-loading", candidates: [] };
  const state = ctx.state;
  const role = ctx.role;
  if (!state.welcomeCompletedAt && !state.welcomeDismissedAt) {
    return { guide: null, blocked: "welcome-pending", candidates: [] };
  }
  if (isJourneyPaused()) return { guide: null, blocked: "journey-paused", candidates: [] };
  if (ctx.guideActive) return { guide: null, blocked: "guide-active", candidates: [] };
  if (ctx.pageBlocked) return { guide: null, blocked: "page-blocked", candidates: [] };
  if (ctx.formDirty) return { guide: null, blocked: "form-dirty", candidates: [] };
  if (!isAutoGuideCooldownClear(ctx.pathname)) {
    return { guide: null, blocked: "cooldown", candidates: [] };
  }

  const root = ctx.dom ?? (typeof document !== "undefined" ? document : null);
  if (!root) return { guide: null, blocked: "targets-missing", candidates: [] };

  const candidates = selectAutoGuide(role, state, ctx.pathname, root);
  if (candidates.length > 0) {
    return { guide: candidates[0]!, blocked: null, candidates };
  }

  // Route may still be mounting (lazy page / iframe chrome). If a guide matches
  // the path but its anchors are not visible yet, signal targets-missing so the
  // orchestrator retries — otherwise Next/Back never appears.
  const pendingOnRoute = guidesForRole(role).some((g) => {
    if (!g.automatic) return false;
    if (!routeMatches(g.routeMatcher, ctx.pathname)) return false;
    if (isGuideSkippedThisSession(g.id)) return false;
    const progress = progressOf(state, g.id);
    if (progress) {
      const versionCaughtUp = progress.guideVersion >= g.version;
      if ((progress.status === "COMPLETED" || progress.status === "DISMISSED") && versionCaughtUp) {
        return false;
      }
    }
    return true;
  });

  return {
    guide: null,
    blocked: pendingOnRoute ? "targets-missing" : "no-candidates",
    candidates,
  };
}

/** Blockers: never auto-launch over another dialog/drawer or urgent overlay. */
export function pageIsBlocked(root: ParentNode = document): boolean {
  // Ignore the Academy guide card itself (it uses role="dialog").
  const foreignDialog = Array.from(root.querySelectorAll('[role="dialog"]')).some(
    (el) => el.getAttribute("data-testid") !== "academy-guide-card",
  );
  return Boolean(
    foreignDialog ||
    root.querySelector('[data-testid="modal-backdrop"]') ||
    root.querySelector('[data-testid="drawer-backdrop"]') ||
    root.querySelector('[data-testid="confirm-dialog"]') ||
    root.querySelector('[data-blocking-overlay="true"]'),
  );
}

/** Heuristic: dirty form fields that shouldn't be interrupted mid-edit. */
export function pageHasUnsavedForm(root: ParentNode = document): boolean {
  const dirty = root.querySelector(
    'form[data-dirty="true"], [data-guide-block="unsaved"], [data-unsaved="true"]',
  );
  return Boolean(dirty);
}
