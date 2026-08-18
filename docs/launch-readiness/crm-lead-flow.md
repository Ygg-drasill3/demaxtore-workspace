# CRM Lead Flow — DeMaxtore

**Status:** Process documentation for sales & customer success. **No CRM UI in product yet** (~20% maturity per flexport-gap-analysis). Use spreadsheet, HubSpot, or Pipedrive until Sprint 15F.

---

## Lifecycle stages

```
Lead → Qualified → Discovery demo → Pilot scoped → Pilot live → Production → Expansion
```

| Stage | Definition | Exit criteria |
|-------|------------|---------------|
| **Lead** | Inbound or outbound contact | ICP fit confirmed |
| **Qualified** | BANT-ish discovery done | Budget/timeline/import volume discussed |
| **Discovery demo** | 30-min product demo delivered | Champion identified |
| **Pilot scoped** | SOW / pilot agreement draft | 5–20 users, 1–2 trade lanes |
| **Pilot live** | Sandbox or dedicated tenant | `demo:seed` or custom seed; weekly check-in |
| **Production** | Contract signed, prod deploy | SSO, DNS, support SLA |
| **Expansion** | Upsell modules / seats | MC/BC adoption, more suppliers |

---

## ICP (ideal customer profile)

- Mid-market **importer / distributor** (food, FMCG, ingredients)  
- €5M–€200M import spend  
- 3+ active supplier relationships per category  
- Pain: email RFQs, no shipment visibility, audit pressure  
- Champion: Head of Procurement, Supply Chain Director, or COO  

**Disqualifiers:** pure domestic procurement, no ocean freight, &lt;2 imports/year

---

## Lead capture fields (CRM minimum)

| Field | Example |
|-------|---------|
| Company | ABC Foods Germany GmbH |
| Country | DE |
| Segment | FMCG / Food importer |
| Import spend (est.) | €12M/year |
| Primary lane | TR/IT → DE |
| Champion name + role | Anna Becker, Procurement |
| Source | Outbound / Referral / Event |
| Product interest | RFQ, CommodityBid, SmartContainer |
| Competitor | Email + Excel, legacy forwarder portal |
| Next action date | 2026-06-20 |
| Owner | Sales rep |

---

## Stage activities

### Lead → Qualified
- Research company (LinkedIn, import data if available)
- 15-min qualification call
- Send one-pager + link to `/welcome`

### Qualified → Discovery demo
- Book 45 min; send [sales-demo-checklist.md](./sales-demo-checklist.md) to SE
- Run ABC Foods demo script
- Log: attendees, objections, modules shown

### Discovery demo → Pilot scoped
- Draft pilot proposal:
  - **Users:** 1 buyer org, 3–5 suppliers, 1 DeMaxtore ops seat
  - **Duration:** 8–12 weeks
  - **Success metrics:** 2 RFQs closed, 1 PO issued, 1 shipment tracked, &lt;72h PO ack rate
- Technical: environment choice (shared sandbox vs dedicated)

### Pilot scoped → Pilot live
- `yarn demo:seed` or custom seed for customer naming
- Provision accounts (admin creates users — no self-serve signup)
- Kickoff call: buyer + supplier onboarding copy walkthrough
- Weekly: Control Tower review with ops

### Pilot live → Production
- Security questionnaire / DPA
- Production deploy checklist (`docs/deployment-production-edge.md`)
- Cutover: freeze pilot data or re-seed production
- Handoff to CS + support channel

### Production → Expansion
- Add SmartContainer / BulkContainer programmes
- Additional buyer entities or regions
- Executive dashboard review (`/operations/executive`)

---

## HubSpot pipeline mapping (suggested)

| CRM stage | DeMaxtore stage |
|-----------|-----------------|
| New | Lead |
| Attempting | Lead |
| Connected | Qualified |
| Demo scheduled | Qualified |
| Demo held | Discovery demo |
| Proposal sent | Pilot scoped |
| Negotiation | Pilot scoped |
| Closed won | Production |
| Closed lost | — (capture reason) |

---

## Internal handoff template (Slack / email)

```
🟢 Pilot handoff — {Company}
Champion: {name} ({email})
SE demo date: {date}
Modules: RFQ / CB / MC / BC
Environment: {sandbox URL}
Accounts: buyer + {n} suppliers seeded
Open risks: {list}
Next CS action: kickoff {date}
```

---

## Metrics to track (manual until CRM build)

| Metric | Target |
|--------|--------|
| Lead → demo conversion | &gt;40% |
| Demo → pilot conversion | &gt;25% |
| Pilot → production | &gt;60% |
| Time to first RFQ (pilot) | &lt;14 days |
| Time to first PO (pilot) | &lt;45 days |

---

## Related product hooks (future CRM)

Existing foundation (no UI):
- `account_ownership` — ops + sales assign (`scale-account.service.ts`)
- Executive top customers (`/operations/executive`)
- Growth funnel (`/operations/growth`)
- Onboarding CSV exports (`/onboarding`)

When CRM ships: link **Lead.company** → **Organisation** → **Workspace** pipeline value.
