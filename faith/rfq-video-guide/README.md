# RFQ Video Guide — Screenshots

Screenshots for the **"How RFQ Works"** Learning Center video.

## Flow covered

1. Learning Center — "How RFQ Works" guide card
2. Buyer dashboard — New RFQ entry point
3. Create RFQ — empty form → draft → line items → submit
4. Procurement strategy — Direct RFQ vs CommodityBid Auction
5. Direct RFQ confirmation
6. CommodityBid auction setup
7. RFQ list

## Files

| # | File | Use in video |
|---|------|--------------|
| 01 | `01-learning-center-overview.png` | Intro — Learning Center |
| 02 | `02-how-rfq-works-guide-card.png` | Guide card close-up (exact copy from Learning Center) |
| 03 | `03-buyer-dashboard-new-rfq.png` | Entry point — New RFQ button |
| 04 | `04-rfq-create-form-empty.png` | Step 1 — Create draft |
| 05 | `05-rfq-create-draft-in-progress.png` | Draft in progress |
| 06 | `06-rfq-create-with-line-items.png` | Add line items + full form |
| 07 | `07-rfq-line-items-detail.png` | Line items close-up |
| 08 | `08-procurement-strategy-choice.png` | After submit — choose strategy |
| 09 | `09-direct-rfq-confirm.png` | Direct RFQ path |
| 10 | `10-commoditybid-auction-setup.png` | CommodityBid Auction path |
| 11 | `11-procurement-strategy-both-options.png` | Both options side by side |
| 12 | `12-rfq-list.png` | RFQ workspace list |

## Regenerate

Requires frontend on `:3000` and backend on `:3001`.

```bash
cd apps/e2e && node ../../faith/rfq-video-guide/capture.mjs
```

Login: `buyer1@acme.test` / `Passw0rd!`
