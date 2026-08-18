# Sales Demo Checklist

Use with [customer-demo-guide.md](../customer-demo-guide.md) and [demo-video-script.md](./demo-video-script.md).

---

## T-minus 24 hours — environment

- [ ] Demo environment URL confirmed (staging or local tunnel documented)
- [ ] `yarn workspace @dmx/backend prisma:deploy` — migrations current
- [ ] `yarn demo:seed` — ABC Foods scenario loaded
- [ ] Backend + frontend running; healthz returns 200
- [ ] Test logins: buyer, one supplier, admin
- [ ] Browser: Chromium, 1920×1080, bookmarks hidden
- [ ] Backup: `yarn demo:reset && yarn demo:seed` command ready

---

## T-minus 1 hour — narrative prep

- [ ] Prospect name, industry, and pain noted (email chaos / audit / container mix)
- [ ] Pick storyline: **RFQ-led** (FMCG restock) or **CommodityBid-led** (commodity auction)
- [ ] Confirm attendees: buyer-side only vs buyer + ops vs IT
- [ ] Deck or one-pager ready (screenshots from [product-screenshot-list.md](./product-screenshot-list.md))
- [ ] Calendar buffer: 45 min booked for 30 min demo + Q&A

---

## Live demo flow (30 min)

### Intro (3 min)
- [ ] Landing `/welcome` or login brand — one-liner positioning
- [ ] Set expectation: "workspace-centric, not a marketplace checkout"

### Buyer journey (12 min)
- [ ] Dashboard command center
- [ ] `DEMO-RFQ-ABC-001` — multi-supplier quotes
- [ ] `DEMO-CB-ABC-001` — sealed bid result
- [ ] SmartContainer + BulkContainer quick show (30s each)
- [ ] `DEMO-PO-ABC-001` + shipment in transit

### Supplier + ops (10 min)
- [ ] Switch to `demo.pasta@demaxtore.com` — supplier view
- [ ] Switch to `admin@demaxtore.local` — Control Tower alerts
- [ ] Resolve one alert (optional wow moment)

### Close (5 min)
- [ ] Recap: sourcing → execution → operations in one OS
- [ ] Pilot proposal: users, timeline, success metrics
- [ ] Next step scheduled before hanging up

---

## Objection handling (quick reference)

| Objection | Response |
|-----------|----------|
| "We already use ERP for POs" | DeMaxtore spawns PO at award — ERP integration is export/API on roadmap; pilot focuses on sourcing-to-shipment gap. |
| "Suppliers won't adopt" | Suppliers only see invited workspaces; no new portal for unrelated buyers. |
| "vs Flexport / freight forwarder" | DeMaxtore owns **sourcing + award**; FreightIQ handles sailings inside the order — complementary. |
| "Security / audit" | State machine + timeline events; every transition logged. |

---

## Post-demo (same day)

- [ ] Send follow-up email with recap + screenshot or 60s clip
- [ ] Log opportunity in CRM (see [crm-lead-flow.md](./crm-lead-flow.md))
- [ ] Internal debrief: objections, feature gaps, pilot scope
- [ ] If pilot agreed: provision accounts or schedule `demo:seed` on customer sandbox

---

## Red flags — postpone demo

- [ ] `demo:seed` fails  
- [ ] E2E hardening spec failing on demo environment  
- [ ] Database unreachable  
- [ ] Wrong version deployed (check footer v0.2)

---

## Sign-off

| Role | Name | Date | Demo ready? |
|------|------|------|-------------|
| Sales | | | ☐ |
| Solutions | | | ☐ |
| Engineering (spot check) | | | ☐ |
