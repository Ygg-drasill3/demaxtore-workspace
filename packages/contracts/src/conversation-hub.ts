// =============================================================================
// Sprint 19 — Conversation Hub™ Foundation
// One Conversation per Workspace — permanent business timeline
// =============================================================================

import type { CommWorkspaceType } from "./workspace-communication.js";

export const TimelineItemType = [
  "MESSAGE",
  "DOCUMENT",
  "QUESTION",
  "ANSWER",
  "DECISION",
  "APPROVAL",
  "ACTION_REQUIRED",
  "SYSTEM_EVENT",
  "STATUS_UPDATE",
  "INTERNAL_NOTE",
] as const;
export type TimelineItemType = (typeof TimelineItemType)[number];

export const SystemEventType = [
  "WORKSPACE_CREATED",
  "RFQ_PUBLISHED",
  "QUOTATION_SUBMITTED",
  "SUPPLIER_SELECTED",
  "COMMODITYBID_CLOSED",
  "PURCHASE_ORDER_ISSUED",
  "INSPECTION_SCHEDULED",
  "SHIPMENT_BOOKED",
  "ETA_UPDATED",
  "SHIPMENT_DELIVERED",
] as const;
export type SystemEventType = (typeof SystemEventType)[number];

export const ConversationParticipantRole = [
  "BUYER",
  "SUPPLIER",
  "DEMAXTORE_REPRESENTATIVE",
] as const;
export type ConversationParticipantRole = (typeof ConversationParticipantRole)[number];

export const DeliveryState = ["SENT", "DELIVERED", "READ"] as const;
export type DeliveryState = (typeof DeliveryState)[number];

export interface ConversationParticipant {
  userId: string;
  fullName: string;
  company: string | null;
  role: ConversationParticipantRole;
  email: string;
  whatsapp: string | null;
  preferredLanguage: string;
  timeZone: string;
}

export interface TimelineAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface MessageDeliveryStatus {
  userId: string;
  state: DeliveryState;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface TimelineMention {
  userId: string;
  displayName: string;
  roleAlias?: "BUYER" | "SUPPLIER" | "DEMAXTORE_REPRESENTATIVE";
}

export interface TimelineItem {
  id: string;
  conversationId: string;
  itemType: TimelineItemType;
  body: string;
  authorUserId: string | null;
  authorName: string | null;
  authorRole: string | null;
  visibility: string;
  channelSource: string;
  isSystemEvent: boolean;
  systemEventType: SystemEventType | null;
  metadata: Record<string, unknown>;
  parentMessageId: string | null;
  attachments: TimelineAttachment[];
  deliveryStatuses: MessageDeliveryStatus[];
  mentions: TimelineMention[];
  pinned: boolean;
  pinnedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  readByMe: boolean;
}

export interface ConversationHub {
  id: string;
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  auditWorkspaceId: string;
  status: string;
  createdAt: string;
  participants: ConversationParticipant[];
  timeline: TimelineItem[];
  unreadCount: number;
  header: ConversationOperationalHeader;
  summary: ConversationSummary;
  pendingActions: PendingAction[];
  decisions: DecisionLogEntry[];
  attachmentLibrary: AttachmentLibrary;
  pinnedItems: TimelineItem[];
}

export interface ConversationSearchQuery {
  q?: string;
  participantUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  fileName?: string;
  itemType?: TimelineItemType;
  limit?: number;
  offset?: number;
}

export interface ConversationSearchResult {
  items: TimelineItem[];
  total: number;
}

export type PendingActionKind =
  | "WAITING_SUPPLIER_REPLY"
  | "BUYER_APPROVAL_REQUIRED"
  | "INSPECTION_REPORT_WAITING"
  | "ETA_UPDATED"
  | "DOCUMENT_MISSING"
  | "ACTION_REQUIRED"
  | "UNANSWERED_QUESTION";

export interface PendingAction {
  id: string;
  kind: PendingActionKind;
  title: string;
  description: string;
  timelineItemId: string | null;
  createdAt: string;
  priority: "high" | "medium" | "low";
}

export interface DecisionLogEntry {
  id: string;
  title: string;
  body: string;
  decidedAt: string;
  decidedBy: string | null;
  source: "timeline" | "system";
  timelineItemId: string;
}

export type AttachmentCategory =
  | "QUOTATION"
  | "PURCHASE_ORDER"
  | "INSPECTION"
  | "CERTIFICATE"
  | "INVOICE"
  | "PACKING_LIST"
  | "BILL_OF_LADING"
  | "PHOTO"
  | "VIDEO"
  | "OTHER";

export interface LibraryAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  category: AttachmentCategory;
  timelineItemId: string;
  uploadedBy: string | null;
}

export interface AttachmentLibrary {
  categories: Array<{
    category: AttachmentCategory;
    label: string;
    items: LibraryAttachment[];
  }>;
  totalCount: number;
}

export interface ConversationSummary {
  currentSupplier: string | null;
  currentStage: string;
  shipmentStatus: string | null;
  lastDecision: string | null;
  lastDocumentUploaded: string | null;
  nextRequiredAction: string | null;
}

export interface ConversationOperationalHeader {
  workspaceId: string;
  workspaceRef: string;
  workspaceType: CommWorkspaceType;
  workspaceStatus: string;
  buyer: ConversationParticipant | null;
  supplier: ConversationParticipant | null;
  demaxtoreRep: ConversationParticipant | null;
  lastActivityAt: string | null;
  unreadCount: number;
  pendingActionsCount: number;
}
