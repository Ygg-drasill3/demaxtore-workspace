# Customer Demo Guide — ABC Foods Germany

This guide supports a **5-minute live demo** of DeMaxtore for prospective B2B buyers. All data is synthetic; no real customer information is used.

---

## Demo login accounts

| Role | Email | Password | Organisation |
|------|-------|----------|--------------|
| **Buyer** | `demo.buyer@demaxtore.com` | `Passw0rd!` | ABC Foods Germany |
| Pasta supplier | `demo.pasta@demaxtore.com` | `Passw0rd!` | Alpine Pasta Works |
| Tomato supplier | `demo.tomato@demaxtore.com` | `Passw0rd!` | Mediterranean Tomato Co. |
| Flour supplier | `demo.flour@demaxtore.com` | `Passw0rd!` | Anatolian Flour Mills |
| Juice supplier | `demo.juice@demaxtore.com` | `Passw0rd!` | Nordic Juice Partners |
| **Admin / ops** | `admin@demaxtore.local` | `Passw0rd!` | DeMaxtore Operations |

One-click shortcuts are available on the login page under **Customer demo · ABC Foods**.

---

## Seed & reset commands

```bash
# Full demo setup (base catalog + ABC Foods scenario)
yarn demo:seed

# Remove demo workspaces only (accounts preserved)
yarn demo:reset

# Rebuild scenario after reset
yarn demo:seed
```

**Prerequisites:** PostgreSQL running, migrations applied, base seed at least once:

```bash
yarn workspace @dmx/backend prisma:deploy
yarn workspace @dmx/backend prisma:seed
yarn demo:seed
```

---

## Seeded demo artefacts

| Ref | Type | State | Story beat |
|-----|------|-------|------------|
| `DEMO-RFQ-ABC-001` | RFQ | RFQ_OPEN | Multi-product pantry restock; 3 supplier quotes in |
| `DEMO-RFQ-ABC-002` | RFQ | PO_ISSUED | Awarded pasta programme → order + PO |
| `DEMO-CB-ABC-001` | CommodityBid | CLOSED | Tomato paste sealed bid; winner identified |
| `DEMO-MC-ABC-001` | SmartContainer | MC_PRICING_REQUESTED | Mixed FCL pasta + tomato paste |
| `DEMO-BC-ABC-001` | BulkContainer | BC_SUBMITTED | 18 MT industrial flour |
| `DEMO-PO-ABC-001` | Purchase Order | ISSUED (no ack) | Payment / ack alert in Control Tower |
| `SHP-ORD-DEMO-RFQ-ABC-002-00000000` | Shipment | IN_TRANSIT | ETA exceeded alert |

---

## 5-minute demo flow

### Minute 0–1 — Buyer sourcing portfolio

1. Sign in as **`demo.buyer@demaxtore.com`**
2. Open **RFQ Workspaces** → show `DEMO-RFQ-ABC-001`
   - *Talking point:* “ABC Foods runs one RFQ across pasta, tomato paste, flour, and juice — suppliers quote in parallel.”
3. Open workspace → quotation comparison / supplier activity

### Minute 1–2 — CommodityBid & containers

4. **Commodity Bids** → `DEMO-CB-ABC-001` (closed auction, lowest bid highlighted)
5. Mention **SmartContainer** (`DEMO-MC-ABC-001`) and **BulkContainer** (`DEMO-BC-ABC-001`) for mixed FCL vs bulk programmes

### Minute 2–3 — Award → PO → execution

6. **Purchase Orders** → `DEMO-PO-ABC-001` linked to awarded pasta RFQ
7. Open **Order** workspace from PO → freight already selected in seed chain
8. **Shipments** → in-transit shipment `SHP-ORD-DEMO-RFQ-ABC-002-00000000`

### Minute 3–4 — Supplier perspective

9. Sign in as **`demo.pasta@demaxtore.com`**
10. Show supplier RFQ list, PO awaiting acknowledgement, shipment visibility
    - *Talking point:* “Suppliers see only workspaces they’re invited to — same hub, role-scoped.”

### Minute 4–5 — Control Tower (admin)

11. Sign in as **`admin@demaxtore.local`**
12. Open **Control Tower** (`/operations`)
    - PO acknowledgement alert (payment / execution risk)
    - Shipment ETA exceeded alert
    - Mixed container pricing pending (`DEMO-MC-ABC-001`)
13. Resolve one alert live to show ops workflow

---

## Conversation script (short)

> “ABC Foods Germany sources four pantry categories from multiple suppliers in one workspace. DeMaxtore replaces email threads and spreadsheets with structured RFQs, sealed CommodityBid auctions, and container programmes.
>
> When ABC awards a supplier, a purchase order and order workspace spawn automatically. Freight selection books a shipment — buyers track execution in one portfolio.
>
> Your operations team sees exceptions in the Control Tower before they become customer complaints: late PO acknowledgements, shipment ETA drift, container pricing delays.”

---

## Screens to highlight

| Screen | Route | Why |
|--------|-------|-----|
| Buyer dashboard | `/buyer` | Command centre KPIs |
| RFQ list & workspace | `/buyer/rfq` | Core sourcing |
| CommodityBid workspace | `/workspace/commoditybid/:id` | Reverse auction |
| PO list | `/buyer/purchase-orders` | Post-award execution |
| Shipments | `/buyer/shipments` | Logistics visibility |
| Control Tower | `/operations` | Ops / exception triage |
| SmartContainer workspace | `/workspace/mixed-container/:id` | Mixed FCL demo |
| BulkContainer workspace | `/workspace/bulk-container/:id` | Bulk commodity demo |

---

## Backup plan — demo data corrupted

1. Stop presenting; switch to admin account
2. Run on the demo environment:

```bash
yarn demo:reset && yarn demo:seed
```

3. Hard-refresh browser (clear session if needed)
4. Resume from **Minute 0** with buyer login

If DB is unavailable, fall back to **Dema shortcuts** (`buyer@dema.test`) and walk UI with empty states — explain that live data reloads via `yarn demo:seed`.

---

## Demo readiness checklist

- [ ] `yarn demo:seed` completed without errors
- [ ] Buyer sees ≥ 2 RFQs, 1 CommodityBid, 1 PO, 1 shipment
- [ ] Admin Control Tower shows open alerts
- [ ] Login shortcuts visible for ABC Foods accounts
- [ ] Backend + frontend dev servers running (`yarn dev:backend`, `yarn dev:frontend`)

---

## Notes

- Demo seed is **idempotent** — safe to re-run before each customer meeting.
- `demo:reset` removes `DEMO-*` workspaces only; login accounts remain.
- E2E / test workspaces are excluded from Control Tower counts in development mode.
