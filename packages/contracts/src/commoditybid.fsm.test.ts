import { describe, it, expect } from "vitest";
import {
  COMMODITYBID_TRANSITIONS,
  COMMODITYBID_TERMINAL_STATES,
  findCommodityBidTransition,
  isCommodityBidTerminal,
  type CommodityBidState,
} from "./commoditybid.fsm";

describe("CommodityBid auction FSM (Sprint 9B)", () => {
  it("defines auction lifecycle states", () => {
    const states = new Set(COMMODITYBID_TRANSITIONS.flatMap((t) => [t.from, t.to]).filter((s) => s !== "*"));
    expect(states.has("SCHEDULED")).toBe(true);
    expect(states.has("LIVE")).toBe(true);
    expect(states.has("WINNER_IDENTIFIED")).toBe(true);
    expect(states.has("AWAITING_BUYER_APPROVAL")).toBe(true);
    expect(states.has("ORDERS_SPAWNED")).toBe(true);
  });

  it("schedule_auction moves BID_DRAFT → SCHEDULED", () => {
    const t = findCommodityBidTransition("BID_DRAFT", "schedule_auction");
    expect(t?.to).toBe("SCHEDULED");
    expect(t?.allowedRoles).toContain("BUYER");
  });

  it("auction_started opens LIVE from READY_TO_START", () => {
    const t = findCommodityBidTransition("READY_TO_START", "auction_started");
    expect(t?.to).toBe("LIVE");
    expect(t?.allowedRoles).toEqual(["SYSTEM"]);
  });

  it("live bidding actions stay in LIVE", () => {
    for (const action of ["submit_bid_lot", "revise_bid_lot"] as const) {
      const t = findCommodityBidTransition("LIVE", action);
      expect(t?.from).toBe("LIVE");
      expect(t?.to).toBe("LIVE");
    }
  });

  it("winner_selected is SYSTEM-only from CLOSED", () => {
    const t = findCommodityBidTransition("CLOSED", "winner_selected");
    expect(t?.allowedRoles).toEqual(["SYSTEM"]);
    expect(t?.to).toBe("WINNER_IDENTIFIED");
  });

  it("buyer approves or rejects — no manual award action", () => {
    expect(findCommodityBidTransition("AWAITING_BUYER_APPROVAL", "approve_winner")).toBeDefined();
    expect(findCommodityBidTransition("UNDER_EVALUATION" as CommodityBidState, "draft_award_lot" as never)).toBeUndefined();
  });

  it("terminal states are not re-enterable", () => {
    for (const s of COMMODITYBID_TERMINAL_STATES) {
      expect(isCommodityBidTerminal(s)).toBe(true);
    }
  });
});
