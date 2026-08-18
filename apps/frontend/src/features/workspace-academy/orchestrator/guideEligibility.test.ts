import { afterEach, describe, expect, it } from "vitest";
import type { AcademyStateDTO } from "@dmx/contracts/workspace-academy";
import { guideById } from "../lib/guide-registry";
import {
  evaluateAutoGuideLaunch,
  isGuideAutoEligible,
  selectAutoGuide,
} from "./guideEligibility";
import {
  clearAutoGuideSessionCache,
  markAutoGuideEnded,
  pauseJourney,
  skipGuideForSession,
} from "./GuideCooldown";

function emptyState(overrides: Partial<AcademyStateDTO> = {}): AcademyStateDTO {
  return {
    welcomeCompletedAt: "2026-01-01T00:00:00.000Z",
    welcomeDismissedAt: null,
    processOverviewCompletedAt: null,
    checklistDismissedAt: null,
    lastAutomaticGuideId: null,
    lastAutomaticGuideAt: null,
    guides: [],
    tasks: [],
    recentArticleIds: [],
    ...overrides,
  };
}

function makeDom(selectors: string[]): Document {
  const doc = document.implementation.createHTMLDocument("test");
  for (const sel of selectors) {
    const match = sel.match(/data-guide="([^"]+)"/);
    if (!match) continue;
    const el = doc.createElement("div");
    el.setAttribute("data-guide", match[1]!);
    el.textContent = match[1]!;
    // give layout size for visibility checks
    Object.defineProperty(el, "offsetParent", { get: () => doc.body });
    el.getBoundingClientRect = () => ({
      width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0, toJSON: () => ({}),
    });
    doc.body.appendChild(el);
  }
  return doc;
}

afterEach(() => {
  clearAutoGuideSessionCache();
});

describe("automatic guide eligibility", () => {
  it("auto-selects dashboard guide on first visit without Help Center", () => {
    const state = emptyState();
    const candidates = selectAutoGuide("BUYER", state, "/buyer/dashboard", makeDom(["[data-guide=\"dashboard-kpis\"]"]));
    expect(candidates[0]?.id).toBe("buyer-dashboard-v1");
  });

  it("does not auto-select a completed guide", () => {
    const state = emptyState({
      guides: [{
        guideId: "buyer-dashboard-v1",
        guideVersion: guideById("buyer-dashboard-v1")!.version,
        status: "COMPLETED",
        lastStepIndex: 4,
        displayCount: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:01:00.000Z",
        dismissedAt: null,
      }],
    });
    const guide = guideById("buyer-dashboard-v1")!;
    expect(isGuideAutoEligible(guide, state, "/buyer/dashboard")).toBe(false);
  });

  it("does not auto-select a dismissed guide", () => {
    const guide = guideById("buyer-inbox-v1")!;
    const state = emptyState({
      guides: [{
        guideId: guide.id,
        // Read the live version: a bumped guide is deliberately re-offered, so a
        // hardcoded version here would silently stop testing the dismissal rule.
        guideVersion: guide.version,
        status: "DISMISSED",
        lastStepIndex: 0,
        displayCount: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        dismissedAt: "2026-01-01T00:01:00.000Z",
      }],
    });
    expect(isGuideAutoEligible(guide, state, "/buyer/inbox")).toBe(false);
  });

  it("re-offers a dismissed guide once its content version is bumped", () => {
    const guide = guideById("buyer-inbox-v1")!;
    const state = emptyState({
      guides: [{
        guideId: guide.id,
        guideVersion: guide.version - 1,
        status: "DISMISSED",
        lastStepIndex: 0,
        displayCount: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        dismissedAt: "2026-01-01T00:01:00.000Z",
      }],
    });
    expect(isGuideAutoEligible(guide, state, "/buyer/inbox")).toBe(true);
  });

  it("re-launches a STARTED guide after silent route abort", () => {
    const state = emptyState({
      guides: [{
        guideId: "buyer-commoditybid-create-v1",
        guideVersion: 8,
        status: "STARTED",
        lastStepIndex: 0,
        displayCount: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        dismissedAt: null,
      }],
    });
    expect(
      isGuideAutoEligible(
        guideById("buyer-commoditybid-create-v1")!,
        state,
        "/buyer/commoditybid/new",
        makeDom(['[data-guide="commoditybid-create-form"]']),
      ),
    ).toBe(true);
  });

  it("blocks launch while welcome is pending", () => {
    const decision = evaluateAutoGuideLaunch({
      role: "BUYER",
      state: emptyState({ welcomeCompletedAt: null, welcomeDismissedAt: null }),
      pathname: "/buyer/dashboard",
      guideActive: false,
      pageBlocked: false,
      dom: makeDom(["[data-guide=\"dashboard-kpis\"]"]),
    });
    expect(decision.blocked).toBe("welcome-pending");
    expect(decision.guide).toBeNull();
  });

  it("blocks launch when another modal is open", () => {
    const decision = evaluateAutoGuideLaunch({
      role: "BUYER",
      state: emptyState(),
      pathname: "/buyer/dashboard",
      guideActive: false,
      pageBlocked: true,
      dom: makeDom(["[data-guide=\"dashboard-kpis\"]"]),
    });
    expect(decision.blocked).toBe("page-blocked");
  });

  it("blocks launch when journey is paused", () => {
    pauseJourney();
    const decision = evaluateAutoGuideLaunch({
      role: "BUYER",
      state: emptyState(),
      pathname: "/buyer/rfq",
      guideActive: false,
      pageBlocked: false,
      dom: makeDom(["[data-guide=\"rfq-list\"]"]),
    });
    expect(decision.blocked).toBe("journey-paused");
  });

  it("respects session skip without permanent dismiss", () => {
    skipGuideForSession("buyer-rfq-list-v1");
    const state = emptyState();
    expect(isGuideAutoEligible(guideById("buyer-rfq-list-v1")!, state, "/buyer/rfq")).toBe(false);
  });

  it("launches quotation guide only when comparison panel is visible and base guide seen", () => {
    const state = emptyState({
      guides: [{
        guideId: "buyer-rfq-workspace-v1",
        guideVersion: 1,
        status: "COMPLETED",
        lastStepIndex: 4,
        displayCount: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:01:00.000Z",
        dismissedAt: null,
      }],
    });
    const withoutPanel = selectAutoGuide(
      "BUYER", state, "/workspace/rfq/abc", makeDom(["[data-guide=\"rfq-story-bar\"]"]),
    );
    expect(withoutPanel.some((g) => g.id === "buyer-quotation-comparison-v1")).toBe(false);

    const withPanel = selectAutoGuide(
      "BUYER",
      state,
      "/workspace/rfq/abc",
      makeDom(["[data-guide=\"quotation-comparison\"]", "[data-guide=\"rfq-story-bar\"]"]),
    );
    expect(withPanel[0]?.id).toBe("buyer-quotation-comparison-v1");
  });

  it("prefers RFQ workspace guide before quotation on first visit", () => {
    const state = emptyState();
    const candidates = selectAutoGuide(
      "BUYER",
      state,
      "/workspace/rfq/abc",
      makeDom(["[data-guide=\"rfq-story-bar\"]", "[data-guide=\"quotation-comparison\"]"]),
    );
    // Quotation requires prerequisite workspace guide — so workspace wins
    expect(candidates[0]?.id).toBe("buyer-rfq-workspace-v1");
  });

  it("allows another page guide after route change despite cooldown", () => {
    markAutoGuideEnded("buyer-dashboard-v1", "/buyer/dashboard");
    const decision = evaluateAutoGuideLaunch({
      role: "BUYER",
      state: emptyState(),
      pathname: "/buyer/inbox",
      guideActive: false,
      pageBlocked: false,
      dom: makeDom(["[data-guide=\"buyer-inbox\"]"]),
    });
    expect(decision.blocked).toBeNull();
    expect(decision.guide?.id).toBe("buyer-inbox-v1");
  });

  it("marks freightiq / proforma / split-award as automatic", () => {
    expect(guideById("buyer-freightiq-v1")?.automatic).toBe(true);
    expect(guideById("buyer-proforma-v1")?.automatic).toBe(true);
    expect(guideById("buyer-quotation-comparison-v1")?.automatic).toBe(true);
    expect(guideById("buyer-split-award-v1")?.automatic).toBe(true);
  });
});
