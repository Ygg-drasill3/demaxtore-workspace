# Sprint 11A — Learning Center Review

## Changes

### New learning card

| ID | Title | Slug |
|----|-------|------|
| `direct-rfq` | When to Use Direct RFQ | `direct-rfq` |

### Updated cards

| ID | Change |
|----|--------|
| `rfq` | Emphasizes RFQ as universal entry + strategy choice |
| `commoditybid` | Retitled "When to Use CommodityBid" — competitive sourcing focus |
| `full-flow` | Documents RFQ → strategy → both paths through shipment |

### Content guidance

**Direct RFQ** (`LearningCenterPage.tsx` + `onboarding.ts`):

- Repeat purchases and relationship sourcing
- Suppliers submit quotations; buyer compares and awards
- Best when supplier relationships and negotiated terms matter

**CommodityBid** (`COMMODITYBID_LEARNING.summary` + updated card):

- Competitive reverse auction
- Lowest valid bid wins automatically
- Best for price discovery and competitive sourcing

**Complete trade flow**:

```
Create RFQ → Choose strategy
├── Direct RFQ → Responses → Review → PO → Order → FreightIQ → Shipment
└── CommodityBid → Schedule → Invitations → Live → Win → Approval → PO → Order → Shipment
```

## Visibility

- CommodityBid learning card **retained** — not downgraded
- New Direct RFQ card **added** — educates on when to choose each path
- Learning Center route `/learning` unchanged for all roles

## E2E coverage

- `29-procurement-strategy.spec.ts` test 06 validates `learning-card-direct-rfq` and `learning-card-commoditybid`
