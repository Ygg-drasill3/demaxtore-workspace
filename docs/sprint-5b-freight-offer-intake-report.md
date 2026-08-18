# Sprint 5B — Freight Offer Intake Report

## Summary

Extends FreightIQ with **structured forwarder outreach** and **manual offer intake** from external channels (email, phone, WhatsApp, manual entry). Operations collects quotes off-platform and records them as structured `freight_offers` for buyer comparison.

FreightIQ Foundation (`applyFreightAction`, 5A actions) is unchanged; 5B adds parallel communication routes and enrichment.

## Workflow

```
Freight Request
  → Select forwarders (directory)
  → Send communication (EMAIL template generated)
  → Forwarder responds externally
  → Operator intake offer (structured fields)
  → Buyer comparison & selection (5A)
```

## Communication

| Table | Purpose |
|-------|---------|
| `freight_request_communications` | Per-forwarder outreach record (PENDING → SENT → RESPONDED → CLOSED) |

**Send freight request** (`POST …/communications/send-communications`):

- Creates communication rows (status `SENT`, channel e.g. `EMAIL`)
- Stores generated email subject/body in `notes`
- Audit: `freight.communication.created`, `freight.communication.sent`
- Socket: `freight.communication.sent`

## Email template

Subject: `Freight Request – {POL} → {POD}`

Body includes POL, POD, commodity, container, ready date, incoterm, requested reply date, and requested quote fields (carrier, vessel, ETD, ETA, transit, cut-off, ocean freight, validity, remarks).

Preview: `GET /api/freightiq/orders/:orderId/email-template?requestedReplyDate=…`

## Offer intake

`POST …/communications/intake-offer` (ADMIN)

| Field | Validation |
|-------|------------|
| Forwarder | Required active contact |
| Carrier, vessel | Required |
| ETD, ETA | ETA > ETD |
| Transit days | > 0 |
| Ocean freight | > 0 |
| Validity | Required future datetime |
| Cut-off | Required |
| Source | `FORWARDER_EMAIL` \| `FORWARDER_PHONE` \| `FORWARDER_WHATSAPP` \| `MANUAL_ENTRY` |

Creates `freight_offers` row with intake columns (`vessel_name`, `etd`, `eta`, `cut_off`, `offer_source`, `forwarder_contact_id`).

Audit: `freight.offer.intake.created` · Socket: `freight.offer.intake.created`

## Comparison enhancements

Extended columns: forwarder, carrier, vessel, ETD, ETA, transit, cut-off, price, validity.

Indicators (deterministic, no AI): lowest price, fastest transit, earliest ETD, closest cut-off, expiring soon.

## Control Tower (additive)

| Key | Severity | Condition |
|-----|----------|-----------|
| `freight_no_communication_24h` | WARNING | Request >24h, zero communications |
| `freight_no_response_72h` | WARNING | Communication SENT >72h, no response |
| `freight_no_offer_96h` | CRITICAL | Request >96h, zero offers |
| `freight_offer_expired_before_selection` | WARNING | Offer expired, no selection |

## UI

**Order workspace — FreightIQ tab:** forwarders, communications, intake, offers, comparison, history.

**Operations:** `/operations/freight` widgets for pending communications, waiting responses; `/operations/forwarders` directory.

## Out of scope (honoured)

Email parsing AI, OCR, booking APIs, carrier contracts, AI recommendations, freight marketplace revenue.
