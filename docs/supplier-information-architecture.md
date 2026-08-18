# Supplier Information Architecture — Sprint 10B

## Supplier operational journey

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  OPPORTUNITIES   │ ──► │    EXECUTION    │ ──► │  COLLABORATION   │
│ RFQ Invitations  │     │ PO → Order      │     │ Messages         │
│ CommodityBid     │     │ → Shipment      │     │ Notifications    │
└──────────────────┘     │ Trade Documents │     └──────────────────┘
                         └─────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │    KNOWLEDGE      │
                         │ Learning Center   │
                         └───────────────────┘
```

## Menu hierarchy

### HOME
| Label | Route | Purpose |
|-------|-------|---------|
| Dashboard | `/supplier/dashboard` | Supplier Command Center |

### OPPORTUNITIES
| Label | Route | Purpose |
|-------|-------|---------|
| RFQ Invitations | `/supplier/rfq` | Open RFQs awaiting quotation |
| CommodityBid Auctions | `/supplier/commoditybid` | Live and upcoming reverse auctions |

### EXECUTION
| Label | Route | Purpose |
|-------|-------|---------|
| Purchase Orders | `/supplier/purchase-orders` | PO list → `/workspace/po/:id` |
| Orders | `/supplier/orders` | Order list → `/workspace/order/:id` |
| Shipments | `/supplier/shipments` | Shipment list → `/workspace/shipment/:id` |

### COLLABORATION
| Label | Route | Purpose |
|-------|-------|---------|
| Messages | `/supplier/messages` | Workspace conversation index |
| Notifications | `/notifications` | Action inbox + deep links |

### DOCUMENTS
| Label | Route | Purpose |
|-------|-------|---------|
| Trade Documents | `/supplier/trade-documents` | Compliance status across workspaces |

### KNOWLEDGE
| Label | Route | Purpose |
|-------|-------|---------|
| Learning Center | `/learning` | Guides and training |

## Workspace deep links (unchanged)

| Object | Workspace route |
|--------|-----------------|
| RFQ | `/workspace/rfq/:id` |
| CommodityBid | `/workspace/commoditybid/:id` |
| PO | `/workspace/po/:id` |
| Order | `/workspace/order/:id` |
| Shipment | `/workspace/shipment/:id` |

## Quick actions

| Action | Route |
|--------|-------|
| Open RFQs | `/supplier/rfq` |
| Join Auction | `/supplier/commoditybid` |
| View Orders | `/supplier/orders` |
| Open Messages | `/supplier/messages` |
| Upload Docs | `/supplier/trade-documents` |

## Dashboard widget map

| Widget | Answers |
|--------|---------|
| KPI Row | Counts at a glance — all clickable |
| Action Inbox | What should I do next? |
| Opportunity Center | RFQ invites + live/upcoming auctions |
| Execution Center | POs, orders, shipments in flight |
| Document Center | Missing / pending / rejected docs |
| Communication Center | Unread buyer conversations |
| Upcoming Events | Deadlines and milestones chronologically |
| Onboarding | Training — collapsed for experienced suppliers |

## Personalization modes (automatic)

| Mode | Trigger | Onboarding |
|------|---------|------------|
| `new_supplier` | No first trade + onboarding < 50% | Expanded |
| `active_supplier` | Default | Collapsed |
| `top_supplier` | First trade + workload ≥ 10 | Collapsed |
