import type { LegacyMessagingReadMode, LegacyMessagingSurface } from "./legacy-adapter.config.js";
import type { AuthUser } from "../../unified-messaging.types.js";

export interface NormalizedMessagingResult {
  sourceSurface: LegacyMessagingSurface;
  legacyConversationIdHash: string | null;
  unifiedConversationIdHash: string | null;
  contextType: string | null;
  contextIdHash: string | null;
  participantCount: number;
  messageCount: number;
  unreadCount: number;
  attachmentCount: number;
  inboundCount: number;
  outboundCount: number;
  internalCount: number;
  systemCount: number;
  lastMessageTimestamp: string | null;
  hasWhatsAppChannel: boolean;
  deliveryStatusCounts: Record<string, number>;
  missingAuthorCount: number;
  missingContextCount: number;
}

export type MismatchType =
  | "CONVERSATION_MISSING"
  | "CONTEXT_MISMATCH"
  | "MESSAGE_COUNT"
  | "UNREAD_COUNT"
  | "PARTICIPANT_COUNT"
  | "ATTACHMENT_COUNT"
  | "LAST_MESSAGE_TIMESTAMP"
  | "VISIBILITY_DISTRIBUTION"
  | "STATUS_DISTRIBUTION"
  | "DUPLICATE_DETECTED"
  | "ORPHAN_RECORD";

export interface ShadowCompareResult {
  surface: LegacyMessagingSurface;
  matched: boolean;
  mismatchTypes: MismatchType[];
  legacy: NormalizedMessagingResult;
  unified: NormalizedMessagingResult | null;
  durationMs: number;
}

export interface LegacyCompatibleReadInput<TLegacyQuery, TLegacyResponse, TUnifiedResult> {
  surface: LegacyMessagingSurface;
  actor: AuthUser;
  query: TLegacyQuery;
  legacyReader: () => Promise<TLegacyResponse>;
  unifiedReader?: () => Promise<TUnifiedResult>;
  unifiedToLegacyMapper?: (result: TUnifiedResult) => TLegacyResponse;
  normalizeLegacy: (result: TLegacyResponse) => NormalizedMessagingResult;
  normalizeUnified?: (result: TUnifiedResult) => NormalizedMessagingResult;
}

export interface LegacyWriteAdapter {
  mode: "LEGACY_ONLY";
}

export type AuthenticatedActor = AuthUser;
