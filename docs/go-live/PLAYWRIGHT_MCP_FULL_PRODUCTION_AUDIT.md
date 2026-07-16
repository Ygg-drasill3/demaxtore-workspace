# Playwright MCP Full Production Audit

**Audit date:** 2026-07-16  
**Environment:** Production workspace (`demaxtore-backend` on port 3001)  
**Prior decision:** SAFE FOR CONTROLLED ENTERPRISE PILOT (with P2 findings)

## Executive summary

Final hardening completed for MSG-001 (duplicate messages) and PAY-UI-002 (inconsistent payment notice). Real-time workspace messaging certified with buyer/supplier dual-context Playwright tests including Socket.io reconnect recovery.

**Updated decision:** SAFE FOR CONTROLLED ENTERPRISE PILOT

## Finding status (post-remediation)

| ID | Severity | Description | Status |
| -- | -------- | ----------- | ------ |
| MSG-001 | P2 | Double-click message send creates duplicate messages | **RESOLVED** |
| PAY-UI-002 | P2 | Online payment disabled notice missing on Order Workspace | **RESOLVED** |

### MSG-001 — evidence

**Root cause (reproduced):** Each HTTP POST received a fresh `Idempotency-Key` from the axios interceptor (`crypto.randomUUID()` per request). Rapid double-clicks and Enter+click produced independent keys, so neither HTTP middleware nor application logic deduplicated user messages.

**Remediation:**

- Frontend: `ConversationHubPanel` — single-flight send guard, disabled control while in-flight, Enter without Shift submits once, `clientMessageId` + matching `Idempotency-Key`, draft preserved on failure, `hub-send-error` alert.
- Backend: `client_message_id` column with unique constraint `(conversation_id, author_user_id, client_message_id)`; pre-insert lookup + P2002 race handling; idempotency scoped to sender + conversation.
- Migration: `20260716120000_workspace_message_client_idempotency`

**Regression tests:**

- `communication.service.idempotency.test.ts` (4 cases)
- `14-workspace-communication.spec.ts` test 10 — concurrent API duplicate
- `64-final-pilot-certification.spec.ts` — double-click UI guard

### PAY-UI-002 — evidence

**Root cause:** `OnlinePaymentDisabledNotice` existed only in `TradeFinancialPanel`; Order and PO workspaces had no payment-capabilities-driven notice.

**Remediation:**

- Shared `OnlinePaymentDisabledNotice` component (`onlineCollectionEnabled === false` or capabilities API failure → safe fallback message).
- Placed on Trade (via `TradeFinancialPanel`), Order (`order-payment-section`), PO (`po-payment-notice`).
- No checkout button or fake provider when disabled.

**Regression tests:**

- `OnlinePaymentDisabledNotice.test.tsx` (3 cases)
- `63-payment-disabled-notice.spec.ts` (API + Trade + Order UI)

## Messaging certification (Playwright MCP / E2E)

| Check | Result | Evidence |
| ----- | ------ | -------- |
| Real-time without reload | **PASS** | `64-final-pilot-certification.spec.ts` buyer→supplier, supplier→buyer |
| Socket reconnect | **PASS** | Supplier context offline/online; timeline refetch on `socket.io` reconnect |
| Missed-message recovery | **PASS** | Message sent via API while supplier offline appears once after reconnect |
| Duplicate prevention | **PASS** | MSG-001 backend + UI; certification double-click test |
| Ordering | **PASS** | Chronological timeline in dual-context tests |
| Read/unread | **PASS** | Existing `14-workspace-communication.spec.ts` test 05 |
| Tenant isolation | **PASS** | Existing `14-workspace-communication.spec.ts` test 07 |
| Attachments | **NOT CERTIFIED FOR INITIAL PILOT** | Upload path exists; full attachment security matrix not executed |

## Payment certification

| Check | Result |
| ----- | ------ |
| Trade Workspace notice | **PASS** |
| Order Workspace notice | **PASS** |
| No fake checkout | **PASS** |
| Intent creation safely blocked (production) | **PASS** — `onlineCollectionEnabled: false`, `paymentIntentApiEnabled: false` |
| Manual tracking permissions | **PASS** — unchanged; role-gated backend |
| Online collection | **NOT CERTIFIED** — intentionally disabled |

## Test baseline (2026-07-16)

| Suite | Result |
| ----- | ------ |
| Backend | 201/201 |
| Frontend | 93/93 |
| Contracts | 125/125 |
| Auth E2E | 4/4 |
| Workspace Communication E2E | 10/10 (incl. MSG-001) |
| Final pilot certification E2E | 5/5 |
| Payment notice E2E | 3/3 |
| Freight Estimate Layer E2E | 8/8 |
| Enterprise Readiness E2E | 10/10 |

## Not certified (explicit)

- WhatsApp messaging
- Online payment collection
- Workspace messaging attachments (initial pilot scope)

## Production MCP certification (2026-07-16 afternoon)

Full Playwright MCP audit against **https://workspace.demaxtore.com** documented in [`FINAL_PLAYWRIGHT_MCP_CERTIFICATION.md`](./FINAL_PLAYWRIGHT_MCP_CERTIFICATION.md).

| Metric | Result |
| ------ | ------ |
| Production commit verified | `e1b81f1f03b7842ed2bf6f0672cf9d5f6f41ef1a` |
| Greenfield RFQ→Order (prefixed) | **PASS** — RFQ-2026-0270 |
| Real-time messaging (production URL) | **PASS** |
| Route matrix (27 routes × 3 roles) | **27/27 PASS** |
| Mobile 390×844 critical paths | **PASS** |
| P0 / P1 | **0 / 0** |
| New P2 | ATT-001 — attachment download not implemented |

