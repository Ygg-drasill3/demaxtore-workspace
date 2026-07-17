# Unified Messaging Architecture

## Overview

Canonical messaging API: `/api/messaging/conversations`. Legacy surfaces remain via compatibility adapters and `MessagingWriteBridge`.

## Write modes

| Flag | Values |
|------|--------|
| `UNIFIED_MESSAGING_WRITE_MODE` | `legacy_only` (production default), `legacy_primary_unified_mirror`, `unified_primary_legacy_mirror`, `unified_only` |

Post-legacy hooks in `messaging-write.bridge.ts` mirror to unified store and emit `messaging:*` socket events with idempotency keys.

## Components

- `UnifiedMessagingWriteOrchestrator` — dual-write orchestration
- `MessagingWriteBridge` — legacy surface hooks (workspace, direct chat, WhatsApp, RFQ clarification)
- `MessagingEventEmitter` — canonical real-time events
- `MessagingNotificationDedup` — `messaging:{eventType}:{conversationId}:{messageId}:{recipientId}`
- `UnifiedConversationPanel` — shared embed UI for module panels
- Legacy adapters + shadow projector for read-path validation

## Status model

Canonical delivery order: `FAILED > READ > DELIVERED > SENT > QUEUED > PENDING`. One bucket per message via `resolveWhatsAppMessageCanonical`.

## Performance

`batchUnreadCounts` uses a single grouped SQL query (no per-conversation N+1).
