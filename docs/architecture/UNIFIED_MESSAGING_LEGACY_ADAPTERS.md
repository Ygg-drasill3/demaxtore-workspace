# Unified Messaging — Legacy Compatibility Adapters (Phase 3)

Phase 3 introduces a **legacy compatibility adapter layer** that keeps all existing messaging API surfaces unchanged while optionally running **read-only unified shadow queries** for comparison telemetry.

Production behavior remains **legacy primary** until a later controlled rollout.

## Architecture

```
Controller (legacy route)
  → shouldUseAdapterLayer() ?
      no  → legacy service (unchanged)
      yes → LegacyMessagingAdapters facade
              → executeLegacyCompatibleRead()
                  → legacyReader()  [always — user response]
                  → unifiedReader() [shadow only, fire-and-observe]
                  → normalize + compare + metrics
```

### Core modules

| File | Responsibility |
|------|----------------|
| `legacy-adapter.config.ts` | Feature flags, read mode parsing, ID hashing |
| `legacy-adapter.service.ts` | Read mode dispatcher (`executeLegacyCompatibleRead`) |
| `legacy-adapter.normalizer.ts` | PII-safe normalized projections |
| `legacy-adapter.comparator.ts` | Mismatch detection with timestamp tolerance |
| `legacy-adapter.metrics.ts` | Counters + structured logs (no PII) |
| `unified-shadow-projector.ts` | Read-only DB projections for shadow compare |
| `legacy-adapter.facade.ts` | Per-surface adapter wiring |
| `legacy-write.adapter.ts` | Write interface stub (`LEGACY_ONLY`) |

## Surface mapping

| Legacy surface | Routes | Legacy service | Unified shadow projection |
|----------------|--------|----------------|---------------------------|
| Workspace Communication | `/api/workspace-communication/:type/:id/*` | `CommunicationService.getConversation`, `searchMessages` | `workspace_conversations` by `workspaceType` + `workspaceId` |
| Conversation Hub | `/api/workspaces/:type/:id/conversation/*` | `ConversationHubService.getHub`, `search` | Same workspace conversation projection |
| Workspace Inbox | `/api/workspace-inbox` | `WorkspaceInboxService.getInbox` | Aggregate card counts (shadow list TBD Phase 4) |
| Portfolio Messages | `/api/portfolio/messages` | `PortfolioService.listMessages` | Aggregate list counts |
| Direct Chat | `/api/chat/*`, `/api/conversations/*` (GET) | `TradeChatService` list/get | `direct_conversations` + `direct_messages` |
| WhatsApp Inbox | `/api/whatsapp/*` (GET) | `WhatsAppInboxService` | `whatsapp_conversations` + `whatsapp_messages` |
| RFQ Clarifications | `/api/rfq/:id/clarifications` | `RfqService.listClarifications` | `clarification_threads` by workspace |

**Not adapted in Phase 3:** POST/write paths, WhatsApp webhook handler, status updates, mark-read mutations.

## Read modes

| Mode | Behavior |
|------|----------|
| `legacy` | Legacy service only (default) |
| `shadow` | Return legacy; run unified read in background; compare + log |
| `unified_fallback` | Reserved — not enabled in production this phase |
| `unified` | Reserved — not enabled in production this phase |

Invalid `UNIFIED_MESSAGING_READ_MODE` values fall back to `legacy` with a warning.

## Feature flags

| Flag | Production default | Purpose |
|------|-------------------|---------|
| `UNIFIED_MESSAGING_ENABLED` | `false` | Unified API (`/api/messaging/conversations`) |
| `UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED` | `false` | Route through adapter dispatcher |
| `UNIFIED_MESSAGING_SHADOW_READ_ENABLED` | `false` | Enable background unified reads |
| `UNIFIED_MESSAGING_READ_MODE` | `legacy` | Read strategy |
| `UNIFIED_MESSAGING_SHADOW_TIMEOUT_MS` | `1000` | Shadow query timeout |

### Staging shadow test

```bash
UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=true
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true
UNIFIED_MESSAGING_READ_MODE=shadow
```

### Rollback

```bash
UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=false
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=false
UNIFIED_MESSAGING_READ_MODE=legacy
```

## Authorization

Shadow reads use the **same actor context** as the legacy endpoint. Unified projections apply role-based message filtering (e.g. buyers cannot see `INTERNAL` / `ADMIN_ONLY` content). Shadow authorization failures are logged as metrics and do not affect the legacy response.

## Shadow comparison

Normalized fields (no message body, phone, names, or tokens):

- Conversation/context presence (hashed IDs)
- Message, unread, participant, attachment counts
- Internal/system/external distribution
- WhatsApp delivery status distribution
- Last message timestamp (±2s tolerance)

### Metrics

- `unified_messaging_shadow_read_total`
- `unified_messaging_shadow_read_success_total`
- `unified_messaging_shadow_read_error_total`
- `unified_messaging_shadow_mismatch_total`
- Latency debug logs: `unified_messaging_legacy_latency_ms`, `unified_messaging_unified_latency_ms`

Labels: `surface`, `mismatchType`, `readMode` — never high-cardinality IDs.

### Shadow compare script

```bash
npx tsx apps/backend/scripts/messaging-shadow-compare.ts --all --limit=25 --output-report=/tmp/shadow.json
```

Read-only. Report contains counts and mismatch categories only.

## Known data alignment gaps

- Inbox/portfolio list-level shadow uses aggregate counts until full unified list projection ships in Phase 4.
- Conversation Hub operational summary fields are legacy-only (not fabricated by mapper).
- Clarification threads may not yet exist in unified backfill (`clarification` dry-run was 0).
- Direct chat unified mapping depends on backfill of `direct_conversations` into unified contexts.

## Phase 4 prerequisites

1. Run `messaging-backfill.ts --apply` in staging with validation.
2. Enable `unified_fallback` in staging; verify zero user-visible regressions.
3. Implement unified write adapters (`LEGACY_MIRROR` then `UNIFIED_ONLY`).
4. WhatsApp dual-read validation with certified webhook regression suite.
5. Frontend `/messages` route behind feature flag.
