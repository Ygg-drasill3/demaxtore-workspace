# Buyer Dashboard Information Architecture — Sprint 10A.2

## Design principle

**10-second rule:** Buyer logs in and immediately sees attention, activity, risk, and next steps.

## Widget hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER — Command Center + quick create (RFQ / Auction)      │
├─────────────────────────────────────────────────────────────┤
│ 1. KPI ROW — Open RFQs | Live Auctions | Orders | Transit   │
│              | Unread Messages | Pending Actions            │
├─────────────────────────────────────────────────────────────┤
│ 2. REQUIRED ACTIONS INBOX (highest priority)                │
├─────────────────────────────────────────────────────────────┤
│ 3. MY ACTIVE TRADES (centerpiece table)                     │
├──────────────────────────┬──────────────────────────────────┤
│ 4a. LIVE AUCTIONS        │ 4b. SHIPMENT COMMAND CENTER      │
├──────────────────────────┴──────────────────────────────────┤
│ 5. DOCUMENTS | MESSAGES | UPCOMING EVENTS (3-col)           │
├─────────────────────────────────────────────────────────────┤
│ 6. ONBOARDING (collapsed for experienced users)           │
└─────────────────────────────────────────────────────────────┘
```

## Personalization modes

| Mode | Trigger | UX |
|------|---------|-----|
| **First Trade** | `!firstTradeCompleted && completionPercent < 60` | Onboarding expanded |
| **Standard** | Default | Onboarding collapsed |
| **Power Buyer** | `firstTradeCompleted && tradeCount >= 8` | Same layout; data-rich tables |

## Action inbox sources

| Action kind | Trigger |
|-------------|---------|
| Approve auction winner | CB `AWAITING_BUYER_APPROVAL` / `WINNER_IDENTIFIED` |
| Review freight offers | Order `FREIGHT_REQUESTED` |
| Approve documents | Trade doc `pendingReview > 0` |
| Respond to message | `unreadCount > 0` |
| Review PO | `pendingAcknowledgement` |

## Mobile priority order

1. KPI row (2-col grid)
2. Action Inbox
3. Active Trades (horizontal scroll table)
4. Live Auctions + Shipments (stacked)
5. Documents / Messages / Events (stacked)
6. Onboarding (collapsed)
