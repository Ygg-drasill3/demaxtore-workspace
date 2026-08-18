# Operations Information Architecture — Sprint 10C

## Operations orchestration map

```
┌─────────────────────────────────────────────────────────────┐
│                  OPERATIONS COMMAND CENTER                   │
│  KPIs · Action Inbox · Trade Board · Monitors · Revenue     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌─────▼─────┐        ┌────▼────┐
    │ Control │         │  Freight  │        │  Scale  │
    │  Tower  │         │    IQ     │        │ Engine  │
    └─────────┘         └───────────┘        └─────────┘
```

## Menu hierarchy (ADMIN)

### HOME
| Label | Route | Purpose |
|-------|-------|---------|
| Command Center | `/admin/dashboard` | Operations cockpit |

### OPERATIONS
| Label | Route | Purpose |
|-------|-------|---------|
| Control Tower | `/operations` | Full alert/funnel/SLA deep dive |
| Freight ops | `/operations/freight` | FreightIQ operations |
| Freight commercial | `/operations/freight-commercial` | Revenue analytics |
| Executive | `/operations/executive` | Scale forecast |
| Growth | `/operations/growth` | Commercial funnel |
| Market intel | `/operations/market-intelligence` | Market opportunities |
| System | `/operations/system` | Enterprise readiness |
| Onboarding | `/onboarding` | User activation |
| Forwarders | `/operations/forwarders` | Forwarder directory |

### WORKSPACES
| Label | Route | Purpose |
|-------|-------|---------|
| RFQs | `/admin/rfq` | Triage queue |
| Commodity Bids | `/admin/commoditybid` | Auction oversight |
| Orders | `/admin/orders` | Order list |

## Escalation flow

```
Alert detected (Control Tower scan)
    → Appears in Action Inbox (priority-sorted)
    → Operator intervenes via workspace deep link
    → Optional resolve in full Control Tower
```

## Intervention flow

| Signal | Widget | Action |
|--------|--------|--------|
| CRITICAL alert | Action Inbox | Intervene → workspace |
| Stalled pipeline | Action Inbox + Trade Board | Unblock trade |
| Shipment delay | Shipment Center | Open shipment |
| Doc compliance | Document Control | Review workspace |
| Comm escalation | Communication Monitor | Open thread |
| Freight pending | FreightIQ Panel | Select offer |
| Overloaded operator | Team Workload | Reassign via executive |

## Personalization modes (automatic)

| Mode | Trigger | Priority widgets |
|------|---------|------------------|
| `operations_agent` | Critical alerts or ≥3 stalled | Action Inbox, Control Tower |
| `operations_manager` | Overloaded operators or stalled trades | Workload, Trade Board |
| `executive` | Healthy platform | Revenue, KPIs |
