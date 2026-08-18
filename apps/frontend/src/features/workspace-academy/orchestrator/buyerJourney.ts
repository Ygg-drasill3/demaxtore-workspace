// First-time Buyer journey stages. Guides map onto these for progress UI.
// The orchestrator never redirects the user — it only tracks natural visits.
import type { AcademyGuideId, AcademyStateDTO } from "@dmx/contracts/workspace-academy";
import { BUYER_SIDEBAR_HUB_TOURS, BUYER_INNER_PAGE_TOURS } from "../lib/buyerSidebarTours";

export const BUYER_JOURNEY_ID = "buyer-main-journey-v1" as const;

export interface JourneyStage {
  id: string;
  guideId?: AcademyGuideId;
  /** True when stage is informational (welcome / process) without a page guide. */
  informational?: boolean;
}

/** Workspace pipeline (detail screens) — counted after hubs when naturally visited. */
const WORKSPACE_PIPELINE_STAGES: readonly JourneyStage[] = [
  { id: "procurement-strategy", guideId: "buyer-procurement-strategy-v1" },
  { id: "rfq-workspace", guideId: "buyer-rfq-workspace-v1" },
  { id: "quotation-comparison", guideId: "buyer-quotation-comparison-v1" },
  { id: "split-award", guideId: "buyer-split-award-v1" },
  { id: "proforma", guideId: "buyer-proforma-v1" },
  { id: "purchase-order", guideId: "buyer-po-workspace-v1" },
  { id: "order-workspace", guideId: "buyer-order-workspace-v1" },
  { id: "freightiq", guideId: "buyer-freightiq-v1" },
  { id: "shipment-workspace", guideId: "buyer-shipment-workspace-v1" },
  { id: "commoditybid", guideId: "buyer-commoditybid-v1" },
];

export const BUYER_JOURNEY_STAGES: readonly JourneyStage[] = [
  { id: "welcome", informational: true },
  { id: "process-overview", informational: true },
  // Every sidebar hub (Inbox → Account)
  ...BUYER_SIDEBAR_HUB_TOURS.map((e) => ({
    id: e.guideId.replace(/^buyer-/, "").replace(/-v\d+$/, ""),
    guideId: e.guideId,
  })),
  // Key create / inner list pages
  ...BUYER_INNER_PAGE_TOURS.map((e) => ({
    id: e.guideId.replace(/^buyer-/, "").replace(/-v\d+$/, ""),
    guideId: e.guideId,
  })),
  ...WORKSPACE_PIPELINE_STAGES,
] as const;

export function journeyProgress(state: AcademyStateDTO | null): { done: number; total: number; pct: number } {
  const guideStages = BUYER_JOURNEY_STAGES.filter((s) => s.guideId);
  const total = guideStages.length;
  if (!state) return { done: 0, total, pct: 0 };
  let done = 0;
  for (const stage of guideStages) {
    const p = state.guides.find((g) => g.guideId === stage.guideId);
    if (p && (p.status === "COMPLETED" || p.status === "DISMISSED")) done += 1;
  }
  // Informational stages
  if (state.welcomeCompletedAt || state.welcomeDismissedAt) {
    /* counted separately in UI copy — guide stages only for pct */
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function stageForGuide(guideId: string): string | undefined {
  return BUYER_JOURNEY_STAGES.find((s) => s.guideId === guideId)?.id;
}
