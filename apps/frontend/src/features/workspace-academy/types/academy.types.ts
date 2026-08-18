// apps/frontend/src/features/workspace-academy/types/academy.types.ts
//
// Frontend-only types for the Workspace Academy. Shared ids/status enums come
// from @dmx/contracts/workspace-academy — do not redefine them here.
import type { Role } from "@dmx/contracts/auth";
import type {
  AcademyGuideId,
  AcademyStateDTO,
} from "@dmx/contracts/workspace-academy";

export type { AcademyGuideId, AcademyStateDTO };

/** One highlighted step inside a contextual guide (Framer Motion tour layer). */
export interface GuideStep {
  /**
   * Stable selector — always a [data-guide="..."] attribute.
   * Omit for floating popovers (no highlight) when the real UI is inside
   * a cross-origin iframe or otherwise not targetable.
   */
  selector?: string;
  titleKey: string;
  descKey: string;
  /** Optional steps are skipped silently when the element is missing. */
  optional?: boolean;
}

/** A contextual guide registered in the central registry. */
export interface GuideDefinition {
  id: AcademyGuideId;
  version: number;
  titleKey: string;
  descKey: string;
  roles: readonly Role[];
  /** Route pattern, e.g. "/workspace/rfq/:id". Slugs match ":param" segments. */
  routeMatcher: string;
  /** Whether the guide may auto-launch on first eligible visit. */
  automatic: boolean;
  maxAutomaticDisplays: number;
  steps: readonly GuideStep[];
  /** Guides that must be COMPLETED before this one may auto-launch. */
  prerequisiteGuideIds?: readonly AcademyGuideId[];
  /**
   * Higher wins when multiple guides match the same route.
   * Feature unlocks (quotation / proforma / freightiq) should outrank the
   * base workspace tour once their panels are visible.
   * Default: 50.
   */
  priority?: number;
  /**
   * At least one of these selectors must be visible for auto-launch.
   * Used for feature-unlock guides that share a workspace route.
   */
  requireVisibleSelectors?: readonly string[];
  /** Buyer journey stage id (progress UI). */
  journeyStage?: string;
}

/** Academy article — content comes fully from translation keys. */
export interface AcademyArticle {
  id: string;
  category: AcademyCategory;
  roles: readonly Role[];
  titleKey: string;
  summaryKey: string;
  /** Ordered paragraph translation keys. */
  bodyKeys: readonly string[];
  /** Route the article refers to (used for "open screen" action). */
  relatedRoute?: string;
  /** Contextual guide that can be launched from the article. */
  guideId?: AcademyGuideId;
  keywords?: readonly string[];
}

export type AcademyCategory =
  | "getting-started"
  | "workspace"
  | "rfq"
  | "commoditybid"
  | "quotations"
  | "proforma"
  | "purchase-orders"
  | "orders"
  | "production"
  | "inspection"
  | "freightiq"
  | "shipments"
  | "documents"
  | "trade-workspace"
  | "messages"
  | "alerts"
  | "control-tower"
  | "containers";

/** Checklist task definition enriched for UI (labels, routes, unlock hints). */
export interface ChecklistTaskUI {
  id: string;
  titleKey: string;
  lockedHintKey?: string;
  /** Route where the task can be performed. */
  route?: string;
  /** Article that explains the task. */
  articleId?: string;
}

/** One stage of the interactive process overview. */
export interface ProcessStage {
  id: string;
  icon: string; // lucide icon name rendered by the component
  titleKey: string;
  descKey: string;
  workspaceKey: string; // which workspace is involved
  roleKey: string;      // which role acts
  articleId?: string;
  route?: string;
}
