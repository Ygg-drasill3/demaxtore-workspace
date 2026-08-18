# Buyer Information Architecture — Sprint 10A.1

## Trade lifecycle map

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   SOURCING  │ ──► │    EXECUTION     │ ──► │  COLLABORATION  │
│ RFQ         │     │ PO → Order       │     │ Messages        │
│ CommodityBid│     │ → Shipment       │     │ Notifications   │
└─────────────┘     │ Trade Documents  │     └─────────────────┘
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
| Dashboard | `/buyer/dashboard` | Trade Command Center (future 10A) |

### SOURCING
| Label | Route | Purpose |
|-------|-------|---------|
| RFQs | `/buyer/rfq` | Supplier discovery via RFQ |
| Commodity Bids | `/buyer/commoditybid` | Reverse-auction sourcing |

### EXECUTION
| Label | Route | Purpose |
|-------|-------|---------|
| Purchase Orders | `/buyer/purchase-orders` | PO list → `/workspace/po/:id` |
| Orders | `/buyer/orders` | Order list → `/workspace/order/:id` |
| Shipments | `/buyer/shipments` | Shipment list → `/workspace/shipment/:id` |

### COLLABORATION
| Label | Route | Purpose |
|-------|-------|---------|
| Messages | `/buyer/messages` | Workspace conversation index |
| Notifications | `/notifications` | Action inbox + deep links |

### DOCUMENTS
| Label | Route | Purpose |
|-------|-------|---------|
| Trade Documents | `/buyer/trade-documents` | Compliance status across workspaces |

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

## Data sources for list pages (existing APIs only)

| Page | Aggregation |
|------|-------------|
| Purchase Orders | `GET /orders` → `GET /orders/:id/purchase-order` |
| Shipments | `GET /orders` → `GET /orders/:id/spawned-shipments` |
| Trade Documents | `GET /orders` → `GET /trade-documents/:type/:id` |
| Messages | `GET /rfq` + `GET /orders` → `GET /workspace-communication/:type/:id` |

## Quick actions

| Action | Route |
|--------|-------|
| New RFQ | `/buyer/rfq/new` |
| Create CommodityBid | `/buyer/commoditybid/new` |
| Open Messages | `/buyer/messages` |
| View Shipments | `/buyer/shipments` |
| Open Documents | `/buyer/trade-documents` |
