import { describe, expect, it } from "vitest";
import { distanceBetween, geometryFromRect } from "../geometry";
import { computeCardPlacement } from "../useGuideCardPosition";
import { guideMotionReducer, createInitialGuideMotionState } from "../guideMotionState";
import { buildCurvePath } from "../svg/CurvedArrow";
import { targetAnchor } from "../components/AnimatedGuideArrow";

describe("academy motion geometry", () => {
  it("pads target rect for spotlight", () => {
    const g = geometryFromRect({ x: 100, y: 80, width: 200, height: 40 }, { radius: 12 });
    expect(g.x).toBe(90);
    expect(g.y).toBe(70);
    expect(g.width).toBe(220);
    expect(g.height).toBe(60);
    expect(g.radius).toBe(12);
  });

  it("measures distance between targets", () => {
    const d = distanceBetween(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 0, width: 10, height: 10 },
    );
    expect(d).toBeCloseTo(100, 0);
  });
});

describe("card placement", () => {
  it("prefers right side when space allows", () => {
    const p = computeCardPlacement({
      target: {
        x: 40,
        y: 120,
        width: 180,
        height: 80,
        radius: 12,
        visible: true,
        pageTop: 120,
        scrollContainer: null,
      },
      cardHeight: 200,
      viewportW: 1280,
      viewportH: 800,
      rtl: false,
      isMobile: false,
    });
    expect(p.side).toBe("right");
    expect(p.sheet).toBe(false);
    expect(p.x).toBeGreaterThan(220);
  });

  it("uses bottom sheet on mobile", () => {
    const p = computeCardPlacement({
      target: {
        x: 20,
        y: 100,
        width: 300,
        height: 60,
        radius: 12,
        visible: true,
        pageTop: 100,
        scrollContainer: null,
      },
      cardHeight: 240,
      viewportW: 390,
      viewportH: 844,
      rtl: false,
      isMobile: true,
    });
    expect(p.side).toBe("sheet");
    expect(p.sheet).toBe(true);
  });

  it("mirrors horizontal preference in RTL", () => {
    const p = computeCardPlacement({
      target: {
        x: 900,
        y: 120,
        width: 180,
        height: 80,
        radius: 12,
        visible: true,
        pageTop: 120,
        scrollContainer: null,
      },
      cardHeight: 200,
      viewportW: 1280,
      viewportH: 800,
      rtl: true,
      isMobile: false,
    });
    expect(p.side).toBe("left");
  });
});

describe("guide motion state machine", () => {
  it("starts in intro then locates", () => {
    let s = createInitialGuideMotionState(0);
    s = guideMotionReducer(s, { type: "START", withIntro: true });
    expect(s.phase).toBe("INTRO");
    s = guideMotionReducer(s, { type: "INTRO_DONE" });
    expect(s.phase).toBe("LOCATING_TARGET");
  });

  it("tracks step direction on change", () => {
    let s = createInitialGuideMotionState(0);
    s = guideMotionReducer(s, { type: "START", withIntro: false });
    s = guideMotionReducer(s, { type: "ACTIVATED" });
    s = guideMotionReducer(s, { type: "STEP_CHANGE", index: 1, dir: 1 });
    expect(s.stepIndex).toBe(1);
    expect(s.contentDir).toBe(1);
    expect(s.phase).toBe("TRANSITIONING_CONTENT");
  });
});

describe("curved arrow path", () => {
  it("builds a cubic path with positive length", () => {
    const { d, length } = buildCurvePath({ x: 10, y: 10 }, { x: 200, y: 120 });
    expect(d.startsWith("M ")).toBe(true);
    expect(length).toBeGreaterThan(40);
  });

  it("aims at the facing edge aligned with the card, not the tall-target center", () => {
    const to = targetAnchor(
      {
        x: 400,
        y: 80,
        width: 600,
        height: 700,
        radius: 12,
        visible: true,
        pageTop: 80,
        scrollContainer: null,
      },
      { x: 120, y: 220 },
    );
    expect(to.x).toBe(400);
    expect(to.y).toBeCloseTo(220, 0);
  });
});
