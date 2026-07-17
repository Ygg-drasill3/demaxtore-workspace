# Unified Messaging Migration Report

## Phase 4–8 completion (2026-07-17)

### Delivered

- Backfill idempotent (559 duplicates skipped on dry-run)
- `MessagingWriteBridge` wired: workspace communication, direct chat, WhatsApp send/read, RFQ clarification
- `UnifiedConversationPanel` + thin wrappers: `WorkspaceCommunicationPanel`, `OrderFreightChatPanel`
- N+1 unread fix in `unified-messaging.repository.ts`
- WhatsApp `STATUS_DISTRIBUTION` shadow mismatch resolved (0 mismatches)
- Playwright E2E `65-unified-messaging.spec.ts` (4 core scenarios PASS)
- Backend 267/267 unit tests PASS
- Frontend typecheck + build PASS

### Remaining (pre-production cutover)

- Full E2E matrix (20 scenarios) — partial coverage
- Assignment/archive/participant/attachment write paths — bridge stubs exist; not all surfaces wired
- `ConversationHubPanel`, `RfqClarificationPanel` — not yet thin-wrapped
- Notification dedup — metadata key helper; full notifyCommEvent integration pending
- Staging gates A/B/C — not applied (environment not verified as isolated staging)

### Production flags

Unchanged: `legacy_only` read/write, `UNIFIED_MESSAGING_ENABLED=false`
