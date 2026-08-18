# Sprint 9A — Learning Center Report

## Route

`/learning` — accessible to all authenticated roles (buyer, supplier, admin).

## Content Cards

| ID | Title |
|----|-------|
| `rfq` | How RFQ Works |
| `commoditybid` | How CommodityBid Works |
| `freightiq` | How FreightIQ Works |
| `tracking` | How Shipment Tracking Works |
| `trade-docs` | How Trade Documents Work |
| `full-flow` | Complete Trade Flow |

## Implementation

- Static content defined in `LEARNING_CARDS` (`packages/contracts/src/onboarding.ts`).
- Extended copy in `LearningCenterPage.tsx`.
- Video placeholders rendered per card (`learning-video-placeholder-{id}`).
- Opening a guide fires `POST /api/onboarding/learning/open` → audit `learning.content.opened`.

## Navigation

Learning Center linked in sidebar for BUYER, SUPPLIER, and ADMIN roles.

## Future Enhancements (out of scope)

- Embedded video URLs per card
- Role-filtered content
- Search and favourites
