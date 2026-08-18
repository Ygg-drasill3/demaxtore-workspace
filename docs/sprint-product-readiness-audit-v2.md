# Product Readiness Audit v2

**Date:** 2026-06-03  
**Mandate:** No new code. No feature proposals. Answer only:

> Can DeMaxtore be used by a real buyer + real supplier today?

**Method:** Automated test runs (Playwright + Vitest), architecture spot-checks, env/mail/RLS/onboarding review.  
**Supersedes:** `product-reality-audit.md` (2026-02 — described a pre-monorepo stack; obsolete).

---

## Executive verdict

| Scope | Verdict |
|-------|---------|
| **Core trade path (RFQ → PO → Order CLOSED)** | **YES** |
| **CommodityBid sealed path** | **YES** |
| **Overall “real customer today”** | **MOSTLY YES** |

**MOSTLY YES** means: with a **provisioned** buyer, supplier, and admin (seed or manual DB), the product completes the full sourcing-to-delivery workspace chain in the browser. Three gaps remain before calling it unqualified production SaaS (see Amber).

If those ambers are accepted for a **controlled pilot**, Sprint 3C planning is reasonable.

---

## Checklist (your questions)

| # | Question | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | Buyer can open RFQ? | **YES** | `02-rfq-flow` test 01 — UI create form → `RFQ_SUBMITTED` |
| 2 | Supplier can submit quotation? | **YES** | `02-rfq-flow` test 05 — `supplier-quote-form`, SUBMITTED/REVISED |
| 3 | Buyer can compare? | **YES** | `02-rfq-flow` test 05 — `/quotations` API, real totals |
| 4 | Buyer can select supplier? | **YES** | `02-rfq-flow` test 06 — picker → `SUPPLIER_SELECTED` |
| 5 | Supplier can upload PI? | **YES** | `02-rfq-flow` test 08 — multipart `/attachments` + `submit-proforma` |
| 6 | Buyer can issue PO? | **YES** | `02-rfq-flow` test 09 + `05-order-flow` test 05 → `PO_ISSUED` |
| 7 | Order runs start → close? | **YES** | `05-order-flow` tests 06–19 — `CLOSED`, timeline `order.closed` |
| 8 | Mail works? | **AMBER** | Mailer + templates + async send exist; default `EMAIL_PROVIDER=console` logs only. Real inbox needs `smtp` or `resend` + env keys. |
| 9 | Realtime works? | **YES** | `03-realtime-and-isolation` 2/2 — toast on `notification:new`, socket subscribe |
| 10 | Permissions not bypassable? | **YES** | buyer2 cannot see buyer1 RFQ (UI + policy); FSM role checks on mutations |
| 11 | CommodityBid RLS / anonymity? | **YES** | RLS on `commoditybid_submissions`; `withRlsUser` on comparison/my-bids; `commoditybid.sealed-bid.test.ts` 3/3; E2E bidder codes only |
| 12 | Works without seed? | **AMBER** | **Workflows** work on empty DB after migrate. **Accounts** need seed or manual user rows — no self-registration API. Admin supplier directory used in E2E. |

---

## Automated evidence (2026-06-03 run)

| Suite | Result |
|-------|--------|
| `02-rfq-flow.spec.ts` | **9/9 PASS** |
| `03-realtime-and-isolation.spec.ts` | **2/2 PASS** |
| `04-commoditybid-flow.spec.ts` | **7/7 PASS** |
| `05-order-flow.spec.ts` | **19/19 PASS** |
| **E2E total** | **37/37 PASS** (~37s) |
| `@dmx/contracts` (FSM unit) | **43/43 PASS** |
| Backend HTTP (`commoditybid` + scheduler) | **5/5 PASS** |

Local stack: backend `:8001`, frontend `:3000`, PostgreSQL 15 — health OK.

---

## Runtime pillars (no new code audit)

| Pillar | Status | Notes |
|--------|--------|-------|
| RFQ Runtime | YES | `applyTransition()` only; 40 transitions in contracts |
| CommodityBid Runtime | YES | Sealed bid, schedulers, award → order spawn |
| Order Runtime | YES | Port-to-port FSM, flash states, spawn from RFQ/CB |
| Auth / RBAC | YES | JWT + role routes + participant checks |
| Notifications | YES | DB rows + socket `notification:new` |
| In-app messaging | YES | RFQ **clarifications** thread (not separate chat product) |
| Email | AMBER | Infrastructure YES; delivery = env-dependent |
| Realtime | YES | Socket.io bus; workspace + RFQ/CB/Order events |
| Playwright | PASS | See above |
| Regression | PASS | RFQ + CB unchanged suites green after 3B |

---

## Amber items (do not block pilot; block “public SaaS”)

1. **Email** — Code path is production-shaped (`mailer.ts`, Resend/SMTP providers, critical-event fallback). Default dev mode prints to console. For a real customer inbox, set `EMAIL_PROVIDER` + credentials before go-live.

2. **Account provisioning** — No public signup. Pilot requires `prisma:seed` (or admin-inserted users). Buyer/supplier **can** create RFQs/bids once they have credentials.

3. **Operational discipline** — Backend must run post-`prisma migrate deploy` + `prisma generate` (e.g. Order `order_status_updates.delta_days` mapping). Stale Node process on :8001 caused false failures during stabilization.

---

## Red items (none for core path)

Sprint 3C scope is correctly **not** expected here:

- FreightIQ, GPS, IoT, inspection providers, customs, payments, exception center, ERP — **not built** (by design).

---

## Architecture integrity (spot check)

- Workspace state mutations go through `applyTransition()` in RFQ / CommodityBid / Order modules.
- Postgres state-guard trigger remains active.
- Timeline + audit append-only on transitions.
- `spawned_from_id` used for RFQ→Order and CommodityBid→Order.

---

## Recommendation

| Decision | Guidance |
|----------|----------|
| Start Sprint 3C coding today? | **Wait** — run pilot checklist with real SMTP + 1 non-seed user pair if possible |
| Prepare Sprint 3C master prompt? | **Yes** — core product bar is met for controlled pilot |
| Audit verdict for gate | **MOSTLY YES** (core trade = **YES**; production ops = 3 ambers) |

When ambers are closed (email config + user provisioning story + ops runbook), upgrade to full **YES** and begin Sprint 3C implementation.

---

## Post-audit decision (2026-06-03)

Product owner approved **Sprint 3C entry** with amber items recorded as accepted operational debt → see `accepted-operational-debt.md`. Sprint 3C scope → `sprint-3c-scope-decision.md` (Freight Execution Foundation).

---

## What changed since Audit v1 (Feb 2026)

| Then | Now |
|------|-----|
| FastAPI + Mongo mock workspaces | Node monorepo + Postgres + Prisma |
| RFQ reference-only | RFQ runtime + 9 E2E steps |
| No CommodityBid / Order | Both runtime + 26 E2E steps |
| No Playwright green path | 37/37 browser tests |

This is no longer “architecture only.” It is a **working vertical slice** of the B2B trade chain.
