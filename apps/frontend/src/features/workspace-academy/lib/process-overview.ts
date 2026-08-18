// apps/frontend/src/features/workspace-academy/lib/process-overview.ts
//
// The 13 stages of the interactive DeMaxtore process overview.
import type { ProcessStage } from "../types/academy.types";

const s = (
  id: string, icon: string, articleId?: string, route?: string,
): ProcessStage => ({
  id, icon,
  titleKey: `wa.ps.${id}.t`,
  descKey: `wa.ps.${id}.d`,
  workspaceKey: `wa.ps.${id}.ws`,
  roleKey: `wa.ps.${id}.role`,
  articleId, route,
});

export const PROCESS_STAGES: readonly ProcessStage[] = [
  s("createRfq",      "FilePlus",      "rfq-creation",          "/buyer/rfq/new"),
  s("strategy",       "GitBranch",     "procurement-strategy"),
  s("collectOffers",  "Users",         "supplier-invitations"),
  s("compareQuotes",  "Scale",         "quotation-comparison"),
  s("selectSupplier", "BadgeCheck",    "split-award"),
  s("proforma",       "FileCheck",     "proforma-review"),
  s("issuePo",        "FileSignature", "purchase-order"),
  s("production",     "Factory",       "production-tracking"),
  s("inspection",     "SearchCheck",   "inspection"),
  s("freight",        "Container",     "freightiq"),
  s("bookShipment",   "CalendarCheck", "freightiq"),
  s("trackShipment",  "Ship",          "shipment-lifecycle"),
  s("delivery",       "PackageCheck",  "shipment-lifecycle"),
];

/** RFQ → PO → Order → Shipment → Trade workspace chain (visual). */
export const WORKSPACE_CHAIN = [
  { id: "rfq",      labelKey: "wa.chain.rfq" },
  { id: "po",       labelKey: "wa.chain.po" },
  { id: "order",    labelKey: "wa.chain.order" },
  { id: "shipment", labelKey: "wa.chain.shipment" },
  { id: "trade",    labelKey: "wa.chain.trade" },
] as const;
