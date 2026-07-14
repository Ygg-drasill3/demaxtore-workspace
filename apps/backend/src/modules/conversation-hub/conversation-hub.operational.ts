import type { PrismaClient } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type {
  AttachmentCategory,
  AttachmentLibrary,
  ConversationOperationalHeader,
  ConversationParticipant,
  ConversationSummary,
  DecisionLogEntry,
  LibraryAttachment,
  PendingAction,
  PendingActionKind,
  SystemEventType,
  TimelineItem,
} from "@dmx/contracts/conversation-hub";

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  QUOTATION: "Quotation",
  PURCHASE_ORDER: "Purchase Order",
  INSPECTION: "Inspection",
  CERTIFICATE: "Certificates",
  INVOICE: "Invoices",
  PACKING_LIST: "Packing List",
  BILL_OF_LADING: "Bill of Lading",
  PHOTO: "Photos",
  VIDEO: "Videos",
  OTHER: "Other Documents",
};

const DECISION_SYSTEM_EVENTS = new Set<SystemEventType>([
  "SUPPLIER_SELECTED",
  "PURCHASE_ORDER_ISSUED",
  "COMMODITYBID_CLOSED",
  "SHIPMENT_DELIVERED",
]);

const DECISION_EVENT_TITLES: Partial<Record<SystemEventType, string>> = {
  SUPPLIER_SELECTED: "Supplier Selected",
  PURCHASE_ORDER_ISSUED: "Purchase Order Issued",
  COMMODITYBID_CLOSED: "CommodityBid Closed",
  INSPECTION_SCHEDULED: "Inspection Scheduled",
  SHIPMENT_BOOKED: "Shipment Released",
  SHIPMENT_DELIVERED: "Delivery Completed",
  QUOTATION_SUBMITTED: "Quotation Submitted",
};

function humanizeState(state: string): string {
  return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function categorizeAttachment(fileName: string, mimeType: string): AttachmentCategory {
  const name = fileName.toLowerCase();
  if (mimeType.startsWith("image/")) return "PHOTO";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (/quot|quote|bid/.test(name)) return "QUOTATION";
  if (/\bpo[-_]|purchase.?order|^po\./.test(name)) return "PURCHASE_ORDER";
  if (/inspection|survey|qc/.test(name)) return "INSPECTION";
  if (/certificate|cert|coa|origin/.test(name)) return "CERTIFICATE";
  if (/invoice|proforma|commercial/.test(name)) return "INVOICE";
  if (/packing|pack.?list/.test(name)) return "PACKING_LIST";
  if (/bill.?of.?lading|\bbol\b|bl[-_]/.test(name)) return "BILL_OF_LADING";
  return "OTHER";
}

export function buildAttachmentLibrary(timeline: TimelineItem[]): AttachmentLibrary {
  const items: LibraryAttachment[] = [];
  for (const item of timeline) {
    for (const att of item.attachments) {
      items.push({
        ...att,
        category: categorizeAttachment(att.fileName, att.mimeType),
        timelineItemId: item.id,
        uploadedBy: item.authorName,
      });
    }
  }
  items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const byCategory = new Map<AttachmentCategory, LibraryAttachment[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const order: AttachmentCategory[] = [
    "QUOTATION",
    "PURCHASE_ORDER",
    "INSPECTION",
    "CERTIFICATE",
    "INVOICE",
    "PACKING_LIST",
    "BILL_OF_LADING",
    "PHOTO",
    "VIDEO",
    "OTHER",
  ];

  const categories = order
    .filter((c) => (byCategory.get(c)?.length ?? 0) > 0)
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: byCategory.get(category)!,
    }));

  return { categories, totalCount: items.length };
}

export function buildDecisionLog(timeline: TimelineItem[]): DecisionLogEntry[] {
  const entries: DecisionLogEntry[] = [];

  for (const item of timeline) {
    if (item.itemType === "DECISION" || item.itemType === "APPROVAL") {
      entries.push({
        id: `decision-${item.id}`,
        title: item.itemType === "APPROVAL" ? "Approval Recorded" : "Decision Recorded",
        body: item.body,
        decidedAt: item.createdAt,
        decidedBy: item.authorName,
        source: "timeline",
        timelineItemId: item.id,
      });
      continue;
    }
    if (item.isSystemEvent && item.systemEventType && DECISION_SYSTEM_EVENTS.has(item.systemEventType)) {
      entries.push({
        id: `sys-decision-${item.id}`,
        title: DECISION_EVENT_TITLES[item.systemEventType] ?? item.systemEventType,
        body: item.body,
        decidedAt: item.createdAt,
        decidedBy: "DeMaxtore System",
        source: "system",
        timelineItemId: item.id,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime());
}

function unansweredQuestions(timeline: TimelineItem[]): TimelineItem[] {
  const answeredParents = new Set(
    timeline.filter((t) => t.itemType === "ANSWER" && t.parentMessageId).map((t) => t.parentMessageId),
  );
  return timeline.filter((t) => t.itemType === "QUESTION" && !answeredParents.has(t.id));
}

export function buildPendingActions(timeline: TimelineItem[]): PendingAction[] {
  const actions: PendingAction[] = [];
  let seq = 0;

  const push = (
    kind: PendingActionKind,
    title: string,
    description: string,
    timelineItemId: string | null,
    createdAt: string,
    priority: PendingAction["priority"],
  ) => {
    actions.push({
      id: `pending-${kind}-${seq++}`,
      kind,
      title,
      description,
      timelineItemId,
      createdAt,
      priority,
    });
  };

  for (const q of unansweredQuestions(timeline)) {
    push(
      "UNANSWERED_QUESTION",
      "Waiting for Supplier Reply",
      q.body.slice(0, 120),
      q.id,
      q.createdAt,
      "high",
    );
  }

  for (const item of timeline.filter((t) => t.itemType === "ACTION_REQUIRED")) {
    const title =
      /approval/i.test(item.body) ? "Buyer Approval Required" : "Action Required";
    const kind: PendingActionKind = /approval/i.test(item.body)
      ? "BUYER_APPROVAL_REQUIRED"
      : "ACTION_REQUIRED";
    push(kind, title, item.body.slice(0, 120), item.id, item.createdAt, "high");
  }

  for (const item of timeline.filter((t) => t.systemEventType === "ETA_UPDATED")) {
    push("ETA_UPDATED", "ETA Updated", item.body, item.id, item.createdAt, "medium");
  }

  for (const item of timeline.filter((t) => t.systemEventType === "INSPECTION_SCHEDULED")) {
    const hasInspectionDoc = timeline.some(
      (t) =>
        new Date(t.createdAt) > new Date(item.createdAt) &&
        t.attachments.some((a) => categorizeAttachment(a.fileName, a.mimeType) === "INSPECTION"),
    );
    if (!hasInspectionDoc) {
      push(
        "INSPECTION_REPORT_WAITING",
        "Inspection Report Waiting",
        "Inspection scheduled — report not yet uploaded",
        item.id,
        item.createdAt,
        "high",
      );
    }
  }

  const hasRecentDoc = timeline.some(
    (t) => t.attachments.length > 0 && Date.now() - new Date(t.createdAt).getTime() < 7 * 86400000,
  );
  if (!hasRecentDoc && timeline.length > 3) {
    push(
      "DOCUMENT_MISSING",
      "Document Missing",
      "No documents uploaded in the last 7 days",
      null,
      new Date().toISOString(),
      "low",
    );
  }

  return actions.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.priority] - prio[b.priority] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function buildSummary(
  workspaceStatus: string,
  supplierName: string | null,
  shipmentStatus: string | null,
  timeline: TimelineItem[],
  pendingActions: PendingAction[],
): ConversationSummary {
  const decisions = buildDecisionLog(timeline);
  const lastDecision = decisions[0]?.title ?? null;

  let lastDocumentUploaded: string | null = null;
  for (let i = timeline.length - 1; i >= 0; i--) {
    const att = timeline[i].attachments[0];
    if (att) {
      lastDocumentUploaded = att.fileName;
      break;
    }
  }

  const nextRequiredAction = pendingActions[0]?.title ?? null;

  return {
    currentSupplier: supplierName,
    currentStage: humanizeState(workspaceStatus),
    shipmentStatus: shipmentStatus ? humanizeState(shipmentStatus) : null,
    lastDecision,
    lastDocumentUploaded,
    nextRequiredAction,
  };
}

export function buildHeader(
  workspaceType: CommWorkspaceType,
  workspaceId: string,
  workspaceRef: string,
  workspaceStatus: string,
  participants: ConversationParticipant[],
  timeline: TimelineItem[],
  unreadCount: number,
  pendingActionsCount: number,
): ConversationOperationalHeader {
  const lastActivityAt = timeline.length ? timeline[timeline.length - 1].createdAt : null;
  const buyer = participants.find((p) => p.role === "BUYER") ?? null;
  const supplier = participants.find((p) => p.role === "SUPPLIER") ?? null;
  const demaxtoreRep = participants.find((p) => p.role === "DEMAXTORE_REPRESENTATIVE") ?? null;

  return {
    workspaceId,
    workspaceRef,
    workspaceType,
    workspaceStatus: humanizeState(workspaceStatus),
    buyer,
    supplier,
    demaxtoreRep,
    lastActivityAt,
    unreadCount,
    pendingActionsCount,
  };
}

export async function loadWorkspaceOperationalContext(
  db: PrismaClient,
  workspaceType: CommWorkspaceType,
  auditWorkspaceId: string,
): Promise<{ workspaceRef: string; workspaceStatus: string; supplierName: string | null; shipmentStatus: string | null }> {
  const ws = await db.workspace.findUnique({
    where: { id: auditWorkspaceId },
    select: {
      externalRef: true,
      state: true,
      type: true,
      rfqDetails: { select: { selectedSupplierUserId: true } },
      orderWorkspace: {
        select: {
          supplierUserId: true,
          workspaceId: true,
        },
      },
    },
  });

  if (!ws) {
    return { workspaceRef: auditWorkspaceId.slice(0, 8), workspaceStatus: "UNKNOWN", supplierName: null, shipmentStatus: null };
  }

  let supplierUserId: string | null = null;
  if (workspaceType === "RFQ" && ws.rfqDetails?.selectedSupplierUserId) {
    supplierUserId = ws.rfqDetails.selectedSupplierUserId;
  } else if (ws.orderWorkspace?.supplierUserId) {
    supplierUserId = ws.orderWorkspace.supplierUserId;
  }

  let supplierName: string | null = null;
  if (supplierUserId) {
    const u = await db.user.findUnique({
      where: { id: supplierUserId },
      select: { displayName: true, email: true, organisation: { select: { name: true } } },
    });
    supplierName = u?.organisation?.name ?? u?.displayName ?? u?.email?.split("@")[0] ?? null;
  }

  let shipmentStatus: string | null = null;
  if (workspaceType === "SHIPMENT") {
    shipmentStatus = ws.state;
  } else {
    const orderId = ws.orderWorkspace?.workspaceId ?? (ws.type === "ORDER" ? auditWorkspaceId : null);
    if (orderId) {
      const shipment = await db.shipmentWorkspace.findFirst({
        where: { orderWorkspaceId: orderId },
        orderBy: { createdAt: "desc" },
        select: { workspace: { select: { state: true } } },
      });
      shipmentStatus = shipment?.workspace.state ?? null;
    }
  }

  return {
    workspaceRef: ws.externalRef,
    workspaceStatus: ws.state,
    supplierName,
    shipmentStatus,
  };
}

export function getPinnedItems(timeline: TimelineItem[]): TimelineItem[] {
  return timeline
    .filter((t) => t.pinned)
    .sort((a, b) => {
      const pa = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const pb = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return pb - pa;
    });
}
