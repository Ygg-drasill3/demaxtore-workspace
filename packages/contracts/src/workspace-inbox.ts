// =============================================================================
// Workspace Inbox™ — operational control center (cross-workspace)
// =============================================================================

import type { CommWorkspaceType } from "./workspace-communication.js";
import type { PendingActionKind } from "./conversation-hub.js";

export const InboxAttentionBadge = [
  "WAITING_REPLY",
  "APPROVAL_REQUIRED",
  "DELAYED",
  "NEW_MESSAGE",
  "INSPECTION",
  "ETA_UPDATED",
  "COMPLETED",
] as const;
export type InboxAttentionBadge = (typeof InboxAttentionBadge)[number];

export const InboxFilter = [
  "all",
  "rfq",
  "commoditybid",
  "purchase_orders",
  "shipments",
  "completed",
  "waiting_for_me",
  "unread",
  "delayed",
  "archived",
] as const;
export type InboxFilter = (typeof InboxFilter)[number];

export interface InboxSummaryCards {
  activeWorkspaces: number;
  pendingActions: number;
  unreadConversations: number;
  waitingSupplierResponses: number;
  waitingBuyerApprovals: number;
  activeShipments: number;
  delayedShipments: number;
  openInspections: number;
}

export interface InboxPriority {
  id: string;
  title: string;
  description: string;
  kind: PendingActionKind | "SHIPMENT_DELAYED" | "ORDER_COMPLETED" | "QUOTATION_REVISED" | "SUPPLIER_SELECTED";
  urgency: "critical" | "high" | "medium" | "low";
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  workspaceRef: string;
  createdAt: string;
  conversationUrl: string;
  workspaceUrl: string;
}

export interface InboxActivity {
  id: string;
  title: string;
  body: string;
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  workspaceRef: string;
  occurredAt: string;
  conversationUrl: string;
  workspaceUrl: string;
}

export interface InboxWorkspaceCard {
  workspaceId: string;
  workspaceRef: string;
  workspaceType: CommWorkspaceType;
  buyerName: string | null;
  supplierName: string | null;
  productSummary: string | null;
  country: string | null;
  currentStage: string;
  currentStatus: string;
  unreadCount: number;
  pendingActionsCount: number;
  lastActivityAt: string | null;
  lastActivityPreview: string | null;
  badges: InboxAttentionBadge[];
  isArchived: boolean;
  isCompleted: boolean;
  isDelayed: boolean;
  conversationUrl: string;
  workspaceUrl: string;
  documentsUrl: string | null;
  shipmentUrl: string | null;
}

export interface WorkspaceInbox {
  summary: InboxSummaryCards;
  priorities: InboxPriority[];
  recentActivity: InboxActivity[];
  workspaces: InboxWorkspaceCard[];
  totalWorkspaces: number;
}

export interface WorkspaceInboxQuery {
  q?: string;
  filter?: InboxFilter;
  limit?: number;
  offset?: number;
}
