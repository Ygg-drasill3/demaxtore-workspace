import type { MismatchType, NormalizedMessagingResult, ShadowCompareResult } from "./legacy-adapter.types.js";
import type { LegacyMessagingSurface } from "./legacy-adapter.config.js";

const TIMESTAMP_TOLERANCE_MS = 2000;

function tsEqual(a: string | null, b: string | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return a === b;
  return Math.abs(da - db) <= TIMESTAMP_TOLERANCE_MS;
}

export function compareNormalized(
  surface: LegacyMessagingSurface,
  legacy: NormalizedMessagingResult,
  unified: NormalizedMessagingResult | null,
): ShadowCompareResult {
  const started = Date.now();
  const mismatchTypes: MismatchType[] = [];

  if (!unified) {
    mismatchTypes.push("CONVERSATION_MISSING");
    return {
      surface,
      matched: false,
      mismatchTypes,
      legacy,
      unified: null,
      durationMs: Date.now() - started,
    };
  }

  if (legacy.contextType && unified.contextType && legacy.contextType !== unified.contextType) {
    mismatchTypes.push("CONTEXT_MISMATCH");
  }
  if (legacy.contextIdHash && unified.contextIdHash && legacy.contextIdHash !== unified.contextIdHash) {
    mismatchTypes.push("CONTEXT_MISMATCH");
  }
  if (legacy.messageCount !== unified.messageCount) mismatchTypes.push("MESSAGE_COUNT");
  if (legacy.unreadCount !== unified.unreadCount) mismatchTypes.push("UNREAD_COUNT");
  if (legacy.participantCount !== unified.participantCount && legacy.participantCount > 0) {
    mismatchTypes.push("PARTICIPANT_COUNT");
  }
  if (legacy.attachmentCount !== unified.attachmentCount) mismatchTypes.push("ATTACHMENT_COUNT");
  if (!tsEqual(legacy.lastMessageTimestamp, unified.lastMessageTimestamp)) {
    mismatchTypes.push("LAST_MESSAGE_TIMESTAMP");
  }
  if (legacy.internalCount !== unified.internalCount || legacy.systemCount !== unified.systemCount) {
    mismatchTypes.push("VISIBILITY_DISTRIBUTION");
  }
  if (JSON.stringify(legacy.deliveryStatusCounts) !== JSON.stringify(unified.deliveryStatusCounts)) {
    if (legacy.hasWhatsAppChannel || unified.hasWhatsAppChannel) {
      mismatchTypes.push("STATUS_DISTRIBUTION");
    }
  }

  return {
    surface,
    matched: mismatchTypes.length === 0,
    mismatchTypes,
    legacy,
    unified,
    durationMs: Date.now() - started,
  };
}
