// apps/frontend/src/features/workspace-academy/lib/articles.ts
//
// Academy article catalog. All visible text lives in translation keys
// (wa.a.<article>.*) — nothing user-facing is hardcoded here.
import type { Role } from "@dmx/contracts/auth";
import type { AcademyArticle } from "../types/academy.types";
import { OPERATIONS_ROLES } from "./guide-registry";

const ALL: readonly Role[] = [
  "BUYER", "SUPPLIER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER",
  "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER",
  "FORWARDER", "SALES_CONTROL",
];
const BUYER_OPS: readonly Role[] = ["BUYER", ...OPERATIONS_ROLES];

function article(
  id: string,
  category: AcademyArticle["category"],
  roles: readonly Role[],
  paragraphs: number,
  extra?: Partial<AcademyArticle>,
): AcademyArticle {
  const key = id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return {
    id, category, roles,
    titleKey: `wa.a.${key}.title`,
    summaryKey: `wa.a.${key}.sum`,
    bodyKeys: Array.from({ length: paragraphs }, (_, i) => `wa.a.${key}.p${i + 1}`),
    ...extra,
  };
}

export const ACADEMY_ARTICLES: readonly AcademyArticle[] = [
  // Getting started
  article("what-is-demaxtore", "getting-started", ALL, 4, {
    keywords: ["demaxtore", "platform", "workspace"],
  }),
  article("workspace-concept", "workspace", ALL, 5, {
    keywords: ["workspace", "record", "chain", "trade"],
  }),
  article("workspace-chain", "workspace", ALL, 4, {
    keywords: ["rfq", "po", "order", "shipment", "trade", "chain"],
  }),
  article("roles-overview", "getting-started", ALL, 5, {
    keywords: ["buyer", "supplier", "operations", "forwarder", "sales"],
  }),

  // RFQ
  article("rfq-lifecycle", "rfq", BUYER_OPS, 5, {
    relatedRoute: "/buyer/rfq", guideId: "buyer-rfq-workspace-v1",
    keywords: ["rfq", "lifecycle", "states", "story bar"],
  }),
  article("rfq-creation", "rfq", ["BUYER"], 5, {
    relatedRoute: "/buyer/rfq/new", guideId: "buyer-rfq-create-v1",
    keywords: ["rfq", "create", "catalogue", "incoterm", "deadline"],
  }),
  article("procurement-strategy", "rfq", ["BUYER"], 5, {
    guideId: "buyer-procurement-strategy-v1",
    keywords: ["strategy", "direct rfq", "commoditybid", "auction"],
  }),
  article("supplier-invitations", "rfq", [...OPERATIONS_ROLES, "SUPPLIER"], 3, {
    keywords: ["invitation", "assignment", "suppliers"],
  }),

  // Quotations
  article("quotation-comparison", "quotations", ["BUYER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-quotation-comparison-v1",
    keywords: ["quotation", "compare", "price", "lead time", "cif"],
  }),
  article("quotation-submission", "quotations", ["SUPPLIER"], 4, {
    guideId: "supplier-quotation-v1",
    keywords: ["quotation", "submit", "revise", "withdraw", "validity"],
  }),
  article("split-award", "quotations", ["BUYER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-split-award-v1",
    keywords: ["split award", "line item", "partially awarded", "fully awarded"],
  }),

  // Proforma / PO
  article("proforma-review", "proforma", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-proforma-v1",
    keywords: ["proforma", "approve", "correction", "bank details"],
  }),
  article("purchase-order", "purchase-orders", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-po-workspace-v1",
    keywords: ["po", "purchase order", "acknowledge", "issued"],
  }),

  // Orders / production / inspection
  article("order-workspace", "orders", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-order-workspace-v1",
    keywords: ["order", "execution", "production", "milestones"],
  }),
  article("production-tracking", "production", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 4, {
    keywords: ["production", "evidence", "delay", "milestone"],
  }),
  article("inspection", "inspection", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 4, {
    keywords: ["inspection", "pre-shipment", "report", "findings"],
  }),

  // Freight / shipments
  article("freightiq", "freightiq", ["BUYER", ...OPERATIONS_ROLES, "FORWARDER"], 5, {
    guideId: "buyer-freightiq-v1",
    keywords: ["freight", "forwarder", "offer", "vessel", "etd", "eta", "cif"],
  }),
  article("shipment-lifecycle", "shipments", ALL, 5, {
    guideId: "buyer-shipment-workspace-v1",
    keywords: ["shipment", "tracking", "transit", "customs", "delivery"],
  }),

  // Documents
  article("document-center", "documents", ALL, 5, {
    relatedRoute: "/documents", guideId: "buyer-documents-v1",
    keywords: ["documents", "invoice", "packing list", "bill of lading", "certificate"],
  }),
  article("trade-documents", "documents", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 4, {
    relatedRoute: "/buyer/trade-documents",
    keywords: ["compliance", "trade documents", "missing", "expired"],
  }),

  // Trade workspace
  article("trade-workspace", "trade-workspace", ["BUYER", ...OPERATIONS_ROLES, "SALES_CONTROL"], 4, {
    guideId: "buyer-trade-workspace-v1",
    keywords: ["trade", "360", "overview", "financial"],
  }),

  // Messaging / alerts / control tower
  article("messages-whatsapp", "messages", ALL, 4, {
    relatedRoute: "/messages", guideId: "buyer-messages-v1",
    keywords: ["messages", "whatsapp", "conversation", "unified"],
  }),
  article("alerts-exceptions", "alerts", ALL, 4, {
    relatedRoute: "/alerts", guideId: "buyer-alerts-v1",
    keywords: ["alerts", "exceptions", "delay", "eta", "risk"],
  }),
  article("control-tower", "control-tower", ["BUYER", ...OPERATIONS_ROLES, "SALES_CONTROL"], 4, {
    guideId: "buyer-control-tower-v1",
    keywords: ["control tower", "pipeline", "sla", "monitoring"],
  }),

  // CommodityBid + containers
  article("commoditybid", "commoditybid", ["BUYER", "SUPPLIER", ...OPERATIONS_ROLES], 5, {
    guideId: "buyer-commoditybid-v1",
    keywords: ["auction", "reverse", "bid", "live", "winner"],
  }),
  article("container-programs", "containers", ["BUYER", ...OPERATIONS_ROLES], 4, {
    keywords: ["mixed container", "bulk container", "full container", "builder"],
  }),
];

export function articlesForRole(role: Role): AcademyArticle[] {
  return ACADEMY_ARTICLES.filter((a) => a.roles.includes(role));
}

export function articleById(id: string): AcademyArticle | undefined {
  return ACADEMY_ARTICLES.find((a) => a.id === id);
}

export const ACADEMY_CATEGORIES: readonly AcademyArticle["category"][] = [
  "getting-started", "workspace", "rfq", "commoditybid", "quotations", "proforma",
  "purchase-orders", "orders", "production", "inspection", "freightiq", "shipments",
  "documents", "trade-workspace", "messages", "alerts", "control-tower", "containers",
];
