// =============================================================================
// Sprint 5E — Unified workspace communication (not chat / Slack / social)
// =============================================================================

export const CommWorkspaceType = [
  "RFQ",
  "COMMODITYBID",
  "ORDER",
  "SHIPMENT",
  "PO",
  "FREIGHTIQ",
] as const;
export type CommWorkspaceType = (typeof CommWorkspaceType)[number];

export const MessageVisibility = [
  "ALL_PARTICIPANTS",
  "BUYER_ONLY",
  "SUPPLIER_ONLY",
  "ADMIN_ONLY",
  "BUYER_ADMIN",
  "SUPPLIER_ADMIN",
] as const;
export type MessageVisibility = (typeof MessageVisibility)[number];

export const MessageType = [
  "MESSAGE",
  "QUESTION",
  "ANSWER",
  "DECISION",
  "STATUS_UPDATE",
  "INTERNAL_NOTE",
] as const;
export type MessageType = (typeof MessageType)[number];

export const MessageStatus = ["ACTIVE", "EDITED", "DELETED"] as const;
export type MessageStatus = (typeof MessageStatus)[number];

export const CommunicationAction = [
  "create_message",
  "edit_message",
  "delete_message",
  "mark_read",
] as const;
export type CommunicationAction = (typeof CommunicationAction)[number];

/** Timeline-worthy message types (MESSAGE excluded). */
export const TIMELINE_MESSAGE_TYPES: MessageType[] = [
  "QUESTION",
  "ANSWER",
  "DECISION",
  "STATUS_UPDATE",
];

export interface WorkspaceParticipant {
  userId: string;
  displayName: string;
  role: "BUYER" | "SUPPLIER" | "ADMIN";
  participantRole?: string;
}

export interface Mention {
  userId: string;
  displayName: string;
}

export interface ReadReceipt {
  userId: string;
  displayName: string;
  readAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface WorkspaceMessage {
  id: string;
  conversationId: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  messageType: MessageType;
  visibility: MessageVisibility;
  body: string;
  status: MessageStatus;
  parentMessageId: string | null;
  mentions: Mention[];
  attachments: MessageAttachment[];
  readReceipts: ReadReceipt[];
  editedAt: string | null;
  createdAt: string;
  /** True when current viewer has read this message. */
  readByMe: boolean;
}

export interface WorkspaceConversation {
  id: string;
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  auditWorkspaceId: string;
  messages: WorkspaceMessage[];
  unreadCount: number;
  mentionCount: number;
}

export interface MessageSearchQuery {
  authorUserId?: string;
  messageType?: MessageType;
  visibility?: MessageVisibility;
  dateFrom?: string;
  dateTo?: string;
  hasAttachment?: boolean;
  mentionedMe?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  items: WorkspaceMessage[];
  total: number;
}
