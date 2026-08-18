# DeMaxtore — Sprint 2.5
# RFQ Workspace UX Redesign & Wireframes

**Status:** Design specification (no code). Figma-equivalent fidelity.
**Source of design intent:** `/app/docs/sprint-2-ux-review.md` §3 + §6 + §9 + §11 + §13.
**Scope:** RFQ Workspace re-layout, 5 priority components, all waiting-state copy, CTA hierarchy rules.
**Out of scope:** Backend changes, FSM modifications, Sprint 3 (CommodityBid/Order) workspaces.
**Engineering hand-off:** Each wireframe specifies grid, type scale, behaviour, and data binding to the existing `@dmx/contracts` surface.

---

## 0 · Strategic frame

> DeMaxtore's competitor is not Alibaba.
> DeMaxtore's competitor is **WhatsApp · Email · Excel**.
> Therefore we are not designing "state visibility" — we are designing **uncertainty reduction**.

Every component in this redesign answers exactly one of these four questions:

| Q | "What is happening now?"       | shown by **What Happens Next** card                  |
| Q | "Who is responsible?"          | shown by **Owner pill + supplier strip**             |
| Q | "What should I expect?"        | shown by **SLA badges + waiting copy**               |
| Q | "When should it happen?"       | shown by **deadline & SLA countdowns**               |

If a screen does not answer one of those four, it is over-decorated. Remove it.

---

## 1 · Design principles (locked for Sprint 2.5)

1. **One primary CTA per screen.** Everything else is secondary or in overflow.
2. **Above-the-fold real estate is reserved for *certainty*** — state, "what now?", primary action. Not for history, not for participants.
3. **Every waiting state must speak.** No state may exist that shows "nothing to do" with no explanation.
4. **Money is shown wherever it exists.** RFQ value (estimated) · quotation totals · proforma · PO. Importers don't trust money-blind tools.
5. **Tedarikçi aktivitesi her zaman görünür** when state ≥ `RFQ_OPEN`. Single strip, fixed position.
6. **Quotations are first-class.** They are not timeline events; they are objects with their own panel.
7. **All language is buyer-language**, not FSM-language. Internal state names never leak to the UI.

---

## 2 · Grid system (1440 px desktop baseline)

```
┌──── Sidebar 244 ────┬────── Content max 1196 ────────────────────────────┐
│ (existing)          │ outer padding 32 · inner 1132                        │
│                     │ 12-col grid · gutter 20 · column ≈ 76                 │
└─────────────────────┴───────────────────────────────────────────────────┘

Workspace inner grid breaks into two zones:

  PRIMARY  (cols 1-8)   → 716 px  → certainty + decisions + comparisons
  SECONDARY (cols 9-12) → 416 px  → context + reference + history

Mobile (< 768 px):  single column, primary above secondary, sticky bottom action bar.
```

**Type scale:** unchanged from `index.css` — Fraunces display for titles, Inter Tight body. Keep Tabular numerals for any money.

---

## 3 · RFQ Workspace — new layout (anatomy)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ A · Workspace Header                                                    │ 96 px
├─────────────────────────────────────────────────────────────────────────┤
│ B · State Storyline   (renamed progress bar)                            │ 64 px
├─────────────────────────────────────────────────────────────────────────┤
│ C · WHAT HAPPENS NEXT card  (state-driven, the hero of the workspace)   │ 168 px
├─────────────────────────────────────────────────────────────────────────┤
│ D · Supplier Activity Strip  (only when state ≥ RFQ_OPEN)               │ 88 px
├──────────────────────────────────────────┬──────────────────────────────┤
│ E · Quotations panel  (centerpiece)      │ F · Side context             │
│    state ≥ RFQ_OPEN                       │    • Money summary           │
│                                           │    • Documents (compact)     │
│                                           │    • Participants (compact)  │
├──────────────────────────────────────────┴──────────────────────────────┤
│ G · Clarifications  (chat, full-width when active)                      │
├─────────────────────────────────────────────────────────────────────────┤
│ H · Timeline  (collapsed: last 5 events · expand to full audit log)     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Visibility rules:**
- `D` Supplier Activity Strip → render only when state ∈ `{ RFQ_OPEN, QUOTATIONS_CLOSED, UNDER_EVALUATION }`.
- `E` Quotations panel → render only when state ≥ `RFQ_OPEN`. In `SUPPLIER_SELECTED`+, it collapses to "Winner: Acme · $48,000" and the rest fold into "Other quotations".
- `F.Money summary` → render only when any line item has a target price OR any quotation exists.
- `G` Clarifications → always render; empty state if no messages.
- `H` Timeline → always render; collapsed by default.

---

## 4 · Component spec — A · Workspace Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RFQ-2026-0017  ─ You are: Owner ─────────────────────────  · · · · ·   │
│  Stainless steel kitchen sinks, 3,000 units                  [≡ menu]   │
│  Acme Trading · Created Mar 12 · USD 🔒                                  │
│                                       ┌───────────────────────────────┐ │
│                                       │ ● Collecting quotations       │ │
│                                       │   Deadline · 2 days · Mar 18  │ │
│                                       └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anatomy:**
- Top row (`text-xs uppercase tracking-wider text-zinc-500`): RFQ #, separator, **"You are: Owner / Counterparty / Observer"** pill.
- Title — Fraunces 32/40 semibold, max 2 lines, truncate.
- Sub-row: owner organisation · creation date · **currency with lock icon + tooltip** ("Currency is locked after submission.").
- Right block: state badge (renamed copy from §7 of UX review) + **deadline countdown chip** below.
- Overflow menu (top-right): Export PDF · Share read-only · Audit log · Cancel.

**Deadline chip rules:**
- > 7 days: neutral grey
- 2–7 days: amber tone
- < 24 hours: red tone with bold "TODAY · 18:00"
- Past: red "Overdue · 6h ago" (only if state still active)

**Data:** `rfq.state · rfq.title · rfq.externalRef · rfq.currency · rfq.deadlineAt · current user role inferred from participants`.

---

## 5 · Component spec — B · State Storyline (renamed progress bar)

Replaces current `RfqProgressBar`. 7 buyer-readable steps as in UX review §7.3.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ─●─────●─────●─────●─────◉─────○─────○─────                            │
│  Draft  Under  Inviting Collect Review Await   Order                    │
│         review supps    quotes  quotes proform placed                   │
│                                  ↑                                       │
│              ┌───────────────────┴───────────────────┐                  │
│              │  3 of 5 quotations submitted          │  sub-state pill  │
│              └───────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**States:**
- `●` Done step — emerald fill
- `◉` Current step — accent ring (animated breathe, 2s loop)
- `○` Upcoming — neutral outline

**Sub-state pill** appears under the current step bubble for bundled steps:
- `Reviewing quotations`: "X of Y quotations submitted"
- `Awaiting proforma`: "Proforma due in N business days"
- `Inviting suppliers`: "X of N suppliers added"
- Other steps: hidden

**Terminal states** replace the rail with a humanized banner:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⓘ  This RFQ was cancelled by the buyer on Mar 12.                      │
│     Reason: "Specifications changed, will re-issue."                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6 · ★ HERO COMPONENT — C · What Happens Next card

The single most important component in Sprint 2.5. Renders on every workspace, in every state.

### 6.1 Visual anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS NEXT                                                       │
│                                                                          │
│  ✓ RFQ submitted                                                         │
│  → DeMaxtore is currently matching verified manufacturers                │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                     │
│  │ Expected completion  │  │ Current progress     │                     │
│  │ Within 1 business    │  │ 2 of 5 suppliers      │                     │
│  │ day                  │  │ assigned              │                     │
│  └──────────────────────┘  └──────────────────────┘                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Withdraw RFQ                                  ↩ secondary       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anatomy detail:**
1. **Eyebrow** (line 1) — `dmx-eyebrow` class. Always reads "WHAT HAPPENS NEXT".
2. **Past line** (✓ row) — what just completed; one sentence, past tense, success-coloured ✓ glyph.
3. **Future line** (→ row) — what's happening or about to happen; present continuous; medium weight body text.
4. **Two stat cards** — left = SLA expectation, right = live progress; both pull from real backend data, never hardcoded.
5. **Primary CTA inline** — single button, full width on the card, primary tone. If the state is a pure wait state (`RFQ_SUBMITTED`, `PROFORMA_REQUESTED`), the slot shows a secondary action only ("Withdraw" / "Cancel"), never an empty space.

### 6.2 Per-state script (the canonical copy)

This table is the **single source of truth** for `WhatHappensNextCard` copy. Engineering maps state → script.

| State                  | Past (✓)                           | Future (→)                                                              | Stat L                                             | Stat R                                          | Primary CTA                       |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `RFQ_DRAFT`            | Draft created                       | You need to submit this RFQ to DeMaxtore for supplier matching          | "Free edits before submission"                     | "Estimated value: USD ${value}"                 | **Submit RFQ**                    |
| `RFQ_SUBMITTED`        | RFQ submitted                       | DeMaxtore is reviewing your RFQ and matching verified manufacturers     | "Typically < 1 business day"                       | "Position in admin queue: #${pos}"              | Withdraw (secondary)              |
| `REJECTED_BY_ADMIN`    | RFQ returned by DeMaxtore          | Update the highlighted fields and resubmit. See reason below.           | "Common reasons: missing specs · wrong category"  | "0 suppliers contacted yet"                     | **Revise & Re-submit**             |
| `SUPPLIERS_ASSIGNED`   | ${n} suppliers assigned to your RFQ| DeMaxtore is finalising the supplier list and will publish shortly      | "Manual review by DeMaxtore"                       | "${n} of typically 4–6 suppliers"               | — *(admin-driven)*                |
| `RFQ_OPEN`             | RFQ published to ${n} suppliers    | Suppliers are reviewing your RFQ and preparing quotations               | "Deadline: ${countdown}"                            | "${quoted}/${invited} quotations received"      | Post Clarification (secondary)    |
| `QUOTATIONS_CLOSED`    | Quotation window closed            | ${n} quotations are ready for your review                               | "Closed: ${date}"                                    | "${n} quotations to compare"                    | **Start Evaluation**              |
| `UNDER_EVALUATION`     | Evaluation started                  | Choose the winning quotation, or close without award                    | "${n} bids · range $${low}–$${high}"               | "0 selected yet"                                | **Select Supplier**               |
| `SUPPLIER_SELECTED`    | ${supplier} selected                | Request the proforma invoice to lock the order                          | "Locked bid: $${amount}"                            | "Revert possible until proforma requested"      | **Request Proforma**              |
| `PROFORMA_REQUESTED`   | Proforma requested from ${supplier}| ${supplier} is preparing the proforma invoice                            | "SLA: ${slaCountdown} business days remaining"    | "If SLA breaches, RFQ returns to evaluation"   | — *(waiting on supplier)*         |
| `PROFORMA_RECEIVED`    | Proforma received                   | Review the proforma and approve to proceed to PO                         | "Total: $${amount}"                                  | "Currency: ${currency} (locked)"               | **Approve Proforma**              |
| `PROFORMA_APPROVED`    | Proforma approved                   | Issue the Purchase Order to finalise the procurement                     | "PO will create an Order workspace"                | "Final · binding action"                         | **Issue PO**                      |
| `PO_ISSUED`            | PO ${poNumber} issued               | Order workspace will activate shortly                                    | "Total: $${amount}"                                  | "Sprint 3: track shipment milestones"           | Open Order workspace (link)       |
| `CANCELLED`            | RFQ cancelled                       | This RFQ is closed. You can clone it to start a new one.                | "Cancelled: ${date}"                                | "Reason: ${reason}"                              | Clone RFQ                          |
| `EXPIRED`              | No supplier quoted in time          | DeMaxtore will reassign or you can revise the timeline                  | "Original deadline: ${date}"                       | "0 of ${invited} quoted"                          | Clone RFQ · Contact DeMaxtore     |
| `CLOSED_NO_AWARD`      | Closed without selecting a supplier | This RFQ is archived. Clone to refine specs or extend supplier list.   | "Closed: ${date}"                                   | "Reason: ${reason}"                              | Clone RFQ                          |

**Data binding notes:**
- `${pos}` admin queue position — needs new backend endpoint `GET /admin/queue/position/:rfqId`. Lightweight; cache 30s.
- `${slaCountdown}` proforma SLA — derive from `proforma.requestedAt + 5 business days` in `@dmx/contracts`.
- `${countdown}` — same logic as deadline chip; format as "2d 4h" or "Tomorrow 18:00" or "Today".
- `${quoted}` / `${invited}` — already in workspace participants; just expose.

### 6.3 Visual variants by state mood

| Mood       | Background      | Border       | ✓ glyph    | Primary CTA       |
| ---------- | --------------- | ------------ | ---------- | ----------------- |
| Active     | white            | paper-200    | emerald-500| accent-900         |
| Waiting    | paper-50         | paper-200    | accent-900 | secondary outline  |
| Action     | accent-50         | accent-900/15| accent-900 | accent-900 (bold) |
| Returned   | red-50            | red-200      | amber-600  | red-600 (revise)   |
| Terminal+  | emerald-50        | emerald-200  | emerald-600| outline link       |
| Terminal-  | paper-50/grey     | paper-200    | zinc-500   | outline link       |

### 6.4 Empty / fallback rules

- If backend hasn't yet computed `${quoted}/${invited}` (race window after publish), the stat card shows a 24px skeleton, NOT "—".
- If a state isn't in the table (defensive), the card hides entirely and a small banner says *"DeMaxtore is processing this update."*

### 6.5 Interaction notes

- The primary CTA inside the card is the **same DOM button** as the primary in the existing `RfqNextActions`. The CTA hierarchy (§9) means we collapse the action list into "primary inside hero card" + "secondary in action drawer".
- Reason-required CTAs (e.g. Revise & Re-submit) still open the existing reason modal — no new modal pattern.
- Card itself never accepts a click; only its buttons are interactive.

---

## 7 · ★ HERO COMPONENT — D · Supplier Activity Strip

Renders only when state ∈ `{ RFQ_OPEN, QUOTATIONS_CLOSED, UNDER_EVALUATION }`. Hidden everywhere else.

### 7.1 Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPPLIER ACTIVITY                                          updated 12s │
│                                                                          │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                          │
│   │  5  │  │  3  │  │  2  │  │  1  │  │  1  │                          │
│   └─────┘  └─────┘  └─────┘  └─────┘  └─────┘                          │
│   Invited   Viewed    Quoted   Declined Silent                          │
│                                                                          │
│   ╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴       │
│   3 of 5 reviewing · 2 of 5 quoted · 1 declined · 1 silent (no view)   │
│   ╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴       │
│                                                                          │
│   [ Nudge silent suppliers ]  [ View per-supplier detail ]              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anatomy:**
- 5 numeric tiles in fixed order — never reorder, never hide a column even if 0.
- Sentence summary line — humanises the counts ("X of Y" pattern). Tabular numerals.
- Two outlined buttons at the bottom:
  - **Nudge silent suppliers** — sends a polite reminder via the platform's notification system. Disabled when `silent = 0`. Rate-limited to 1 nudge / supplier / 24h.
  - **View per-supplier detail** — opens a side drawer (next subsection).

### 7.2 Per-tile semantics (lock these definitions)

| Tile     | Definition                                                            | Source                                                  |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Invited  | Count of suppliers in `SUPPLIERS_ASSIGNED` participants list           | `rfq.participants where role=COUNTERPARTY`              |
| Viewed   | Number who have opened the workspace at least once since publish      | New telemetry event `workspace.viewed` per supplier     |
| Quoted   | Number with a `submitted` or `revised` quotation                       | Quotations table                                        |
| Declined | Number who explicitly withdrew or declined the invite                  | `quotation.withdrawn` event OR `participant.declined`   |
| Silent   | Invited − Viewed − Quoted − Declined (computed)                        | Derived                                                 |

**Invariant:** Invited == Viewed + Quoted + Declined + Silent. Show a small ⚠ if the math doesn't match (defensive).

### 7.3 Per-supplier detail drawer

Opened by the "View per-supplier detail" button. Right-anchored Drawer (existing `Drawer` primitive, width `lg`).

```
┌─────────── Drawer ───────────────────────────────────────────┐
│ Per-supplier activity                              ✕ close   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ◯ Acme Trading       ●●●●  Quoted $48,000  · 2h ago         │
│    Shenzhen, CN · ✓ Verified since 2024 · 7 past POs          │
│                                                               │
│  ◯ Beta Industries    ●●●○  Quoted $49,500  · 6h ago         │
│    Hangzhou, CN · ✓ Verified · 3 past POs                     │
│                                                               │
│  ◯ Gamma Ltd          ●●○○  Viewed twice    · 1d ago          │
│    Bursa, TR · ✓ Verified · 1 past PO                          │
│    [ Nudge Gamma ]                                            │
│                                                               │
│  ○ Delta Co           ●○○○  Viewed once     · 2d ago          │
│    Ningbo, CN · New supplier (first RFQ)                       │
│    [ Nudge Delta ]                                            │
│                                                               │
│  ○ Epsilon GmbH       ●●●●  Declined        · 3h ago          │
│    Stuttgart, DE · "Out of capacity until June"               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Engagement dots `●●●●`:** Compact 4-step engagement ladder per supplier — Invited / Viewed / Returned / Quoted-or-Declined. Filled dots show how far that supplier has progressed.

**Trust micro-cells:** location · "Verified since YYYY" · past POs count. These three together do enormous trust work. They map directly to UX review §13.2.

**Decline reason:** when a supplier declines, their stated reason is shown inline. Buyer doesn't need to ask "why?".

### 7.4 Update cadence

- Live via Socket.io `workspace:update` event already specified in `@dmx/contracts/socket-events`.
- "updated 12s" badge top-right of strip — reflects last socket event; resets to "live" on update.
- Backend must emit `workspace.viewed` whenever a supplier loads the workspace (deduped to 1×/day/user).

---

## 8 · ★ HERO COMPONENT — E · Quotations Comparison Panel

Replaces the timeline-buried quotation visibility. First-class panel.

### 8.1 Visual — primary view (table comparison)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ QUOTATIONS                                              3 of 5 received │
│                                                                          │
│        ┌──────────┬─────────┬─────────┬─────────┬─────────┐             │
│        │ Spec     │ Acme    │ Beta    │ Gamma   │ Your    │             │
│        │          │ Trading │ Indust. │ Ltd     │ target  │             │
│        ├──────────┼─────────┼─────────┼─────────┼─────────┤             │
│  Total │          │ $48,000 │ $49,500 │ $51,200 │ $50,000 │             │
│        │          │ ◀ lowest│         │         │         │             │
│  Unit  │          │ $16.00  │ $16.50  │ $17.07  │ $16.67  │             │
│  Lead  │          │ 35 d    │ 28 d    │ 21 d    │ 30 d ←  │             │
│        │          │         │         │ ◀ fast  │ target  │             │
│  Incot.│          │ FOB     │ FOB     │ CIF     │ FOB     │             │
│  Sample│          │ Yes     │ Yes     │ No      │ —       │             │
│  Valid │          │ 30 d    │ 14 d    │ 45 d    │ —       │             │
│        ├──────────┼─────────┼─────────┼─────────┼─────────┤             │
│        │   Action │ [Select]│ [Select]│ [Select]│         │             │
│        └──────────┴─────────┴─────────┴─────────┴─────────┘             │
│                                                                          │
│   ▸ Show line-item-level comparison                                     │
│   ▸ Download all quotations as PDF                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anatomy:**
- Header eyebrow + receipt count.
- Comparison matrix — first column is spec name, then one column per quoting supplier, then **"Your target"** column (buyer-only data; never shown to suppliers).
- Highlighted cells: "◀ lowest" for Total, "◀ fast" for Lead, "◀ closest" for any cell within 5% of buyer target. Single-character indicator + accent-900 dot.
- Per-supplier `[Select]` button row — only when state ∈ `{ UNDER_EVALUATION }` and current user is RFQ owner. In `RFQ_OPEN`/`QUOTATIONS_CLOSED` the row is hidden (selection is post-eval).
- Two utility links at bottom: line-item drilldown · PDF export.

### 8.2 Visual — collapsed view (state ≥ `SUPPLIER_SELECTED`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SELECTED QUOTATION                                                       │
│   ★ Acme Trading · $48,000 · 35 d lead · FOB                            │
│   Selected by you on Mar 17                                              │
│                                                                          │
│   ▸ Show other quotations (3)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

Collapsed by default. Expansion shows the same matrix with non-winning quotations greyed out and `[Revert selection]` next to the winner (only available in `SUPPLIER_SELECTED`, never after `PROFORMA_REQUESTED`).

### 8.3 Empty state (state == `RFQ_OPEN`, zero quotations yet)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ QUOTATIONS                                                  0 received  │
│                                                                          │
│      ╭─────────────────────────────────────────╮                        │
│      │  Suppliers are reviewing your RFQ.       │                        │
│      │  Quotations will appear here as they     │                        │
│      │  arrive — you'll be notified instantly.  │                        │
│      ╰─────────────────────────────────────────╯                        │
│                                                                          │
│   See supplier activity above ↑                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Critical: do NOT hide the panel.** A hidden panel reads as "this feature doesn't exist". Keep the panel visible, fill with explanation.

### 8.4 Line-item-level expansion

Clicking "Show line-item-level comparison" expands to a per-line breakdown:

```
   ┌─────────────────────┬──────────┬──────────┬──────────┐
   │ Line 1 · Sink S-201 │ Acme     │ Beta     │ Gamma    │
   │ 1,500 units         │ $24,000  │ $25,500  │ $26,250  │
   │                     │ $16.00/u │ $17.00/u │ $17.50/u │
   ├─────────────────────┼──────────┼──────────┼──────────┤
   │ Line 2 · Sink S-205 │ ...      │ ...      │ ...      │
```

Useful for multi-line RFQs where one supplier may be cheapest on line 1 but expensive on line 2.

### 8.5 Permissions

- BUYER (owner): full view; `[Select]` action available in `UNDER_EVALUATION`.
- SUPPLIER: sees only their own quotation row, never competitors' numbers.
- ADMIN: full view with no `[Select]` (admin doesn't select winners).

---

## 9 · CTA hierarchy — the single primary rule

### 9.1 Rule

Per workspace state, there is **exactly one** primary CTA. It lives inside the What Happens Next card (§6). All other allowed actions become secondary.

### 9.2 The Action Drawer pattern

Secondary and tertiary actions move out of the main view into an **Action Drawer**:

```
┌────────────────────────────────── Action Drawer ──────┐
│  Other actions                            ✕ close      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ────  SECONDARY  ────                                  │
│  ┌────────────────────────────────────────────────┐    │
│  │ Extend deadline           1 of 2 extensions left│    │
│  │ Give suppliers more time (max +14 d total)      │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │ Close quotations early                          │    │
│  │ Stop accepting new quotations now                │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ────  CRITICAL  ────                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │ Cancel RFQ                              ⚠       │    │
│  │ Permanently cancel this RFQ (reason required)    │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

**Trigger:** A small button "More actions ⋯" in the workspace header overflow menu OR a "⋯ Other actions" tile beneath the What Happens Next card.

**Inside the drawer:**
- Each action is a full-width tile with title + 1-line description + state-specific helper ("1 of 2 extensions left", "Cannot be undone").
- Destructive actions (Cancel, Reject, Close without Award) sit under a "Critical" separator with red ⚠ glyph.
- Clicking still opens the existing reason modal where required — no logic change.

### 9.3 Hierarchy table (rendered in §6.2 already; replicated for engineers)

| State                  | Primary (inside hero) | Secondary (in drawer)                  | Critical (in drawer)               |
| ---------------------- | --------------------- | -------------------------------------- | ---------------------------------- |
| `RFQ_DRAFT`            | Submit RFQ            | Edit Draft                              | Cancel                              |
| `RFQ_SUBMITTED`        | — (waiting)           | Withdraw                                |                                    |
| `REJECTED_BY_ADMIN`    | Revise & Re-submit    |                                         | Cancel                              |
| `SUPPLIERS_ASSIGNED`   | — (admin-driven)      |                                         | Cancel                              |
| `RFQ_OPEN`             | Post Clarification    | Extend Deadline · Close Early           | Cancel                              |
| `QUOTATIONS_CLOSED`    | Start Evaluation      |                                         | Cancel                              |
| `UNDER_EVALUATION`     | Select Supplier       |                                         | Close — No Award · Cancel           |
| `SUPPLIER_SELECTED`    | Request Proforma      | Revert Selection                        | Cancel                              |
| `PROFORMA_REQUESTED`   | — (waiting)           |                                         | Cancel                              |
| `PROFORMA_RECEIVED`    | Approve Proforma      | Request Revision                        | Cancel                              |
| `PROFORMA_APPROVED`    | Issue PO              |                                         | Cancel                              |

### 9.4 Confirmations (irreversible primaries)

Every primary action in `{ Submit RFQ, Select Supplier, Issue PO }` triggers a full confirmation modal showing the consequence summary BEFORE executing. Other primaries use the existing reason modal where applicable.

### 9.5 Removing the old vertical button stack

The current `RfqNextActions` shows a vertical stack of equal-weight buttons. **That stack is removed entirely.** What replaces it:
- Primary CTA → embedded inside the What Happens Next card (one button, full width).
- Everything else → Action Drawer behind a single "More actions ⋯" trigger.

This single change is the most impactful in the redesign.

---

## 10 · Waiting state cards — the explicit copy

For each waiting state, here is the exact card the user sees. Implementing engineer maps state → component.

### 10.1 `RFQ_SUBMITTED` — "Under review by DeMaxtore"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ WHAT IS HAPPENING NOW?                                                  │
│ Your RFQ is in DeMaxtore's review queue. Our sourcing team is matching  │
│ verified manufacturers in your category and target market.              │
│                                                                          │
│ WHO IS RESPONSIBLE?                                                     │
│ DeMaxtore Operations team. You'll see the assigned suppliers within 1   │
│ business day. No action required from your side right now.              │
│                                                                          │
│ WHAT SHOULD YOU EXPECT?                                                 │
│ • An email + in-app notification when suppliers are assigned             │
│ • Typically 4–6 suppliers per RFQ in your category                       │
│ • Average review time: 4 working hours (today is a Tuesday — fast lane) │
│                                                                          │
│ WHEN SHOULD THIS HAPPEN?                                                │
│ Within 1 business day. If you don't hear back by Mar 13, 18:00, the     │
│ DeMaxtore operations team will be automatically alerted.                 │
└─────────────────────────────────────────────────────────────────────────┘
```

This card sits **inside** the What Happens Next slot, replacing the 2-stat layout when in a pure waiting state.

### 10.2 `SUPPLIERS_ASSIGNED` — "Inviting suppliers"

```
WHAT IS HAPPENING NOW?
3 of typically 4–6 suppliers have been assigned to your RFQ. DeMaxtore
operations is reviewing the final list before publication.

WHO IS RESPONSIBLE?
DeMaxtore operations. You can request additional suppliers via the
clarifications panel below (private to DeMaxtore admin).

WHAT SHOULD YOU EXPECT?
The RFQ will be published to all assigned suppliers simultaneously.
Suppliers receive an instant email + platform notification.

WHEN SHOULD THIS HAPPEN?
Usually within 2–4 hours of supplier assignment.
```

### 10.3 `RFQ_OPEN` (zero quotations yet, < 24h old)

```
WHAT IS HAPPENING NOW?
Your RFQ is open to 5 verified suppliers. They have received the spec,
attachments, and your deadline. 3 have already viewed it (see strip above).

WHO IS RESPONSIBLE?
Suppliers — they are preparing their quotations.

WHAT SHOULD YOU EXPECT?
First quotations typically arrive within 24–48 hours. Suppliers in
${productCategory} usually need 2–4 business days to confirm production
capacity and pricing.

WHEN SHOULD THIS HAPPEN?
Deadline: ${deadline}. You can extend (up to 2× / +14 days) or close early.
```

### 10.4 `UNDER_EVALUATION` (after Start Evaluation)

```
WHAT IS HAPPENING NOW?
You have started evaluation. Suppliers can no longer submit new bids.
Compare the ${n} quotations in the panel below.

WHO IS RESPONSIBLE?
You — your decision now drives the workflow.

WHAT SHOULD YOU EXPECT?
You can select a winner, request more info via clarifications, or close
without award. If you need to re-open quotations, only DeMaxtore admin
can do that (Decision #4 — requires a reason and a new deadline).

WHEN SHOULD YOU DECIDE?
There is no platform-imposed deadline for evaluation. However, supplier
quotations expire after their stated validity (${earliest} expires first).
```

### 10.5 `PROFORMA_REQUESTED`

```
WHAT IS HAPPENING NOW?
You have requested a proforma invoice from ${supplier}. They are preparing
the document with payment terms, banking details, and final commercial
conditions.

WHO IS RESPONSIBLE?
${supplier}. The locked bid amount is $${amount}.

WHAT SHOULD YOU EXPECT?
A proforma invoice file (PDF). Once received, you can approve to proceed
to PO, or request a revision. If you reject too many revisions, the
supplier may decline — and you'll return to UNDER_EVALUATION.

WHEN SHOULD THIS HAPPEN?
SLA: ${slaCountdown} business days remaining. If the supplier doesn't
submit by then, the RFQ automatically returns to evaluation (FSM
Decision #3).
```

### 10.6 `PROFORMA_RECEIVED`

```
WHAT IS HAPPENING NOW?
${supplier} has uploaded their proforma invoice. The proforma file is
in the Documents panel below.

WHO IS RESPONSIBLE?
You — review the proforma and decide.

WHAT SHOULD YOU EXPECT?
• Approve → moves to PROFORMA_APPROVED, then you issue the PO
• Request revision → returns to supplier with your reason
• Cancel → ends the workflow with a reason

WHEN SHOULD YOU DECIDE?
There is no platform-imposed deadline, but proformas typically expire
in 7–14 days. Check the proforma file's stated validity.
```

### 10.7 Layout note

Each waiting state card uses the same 4-section structure (`WHAT IS HAPPENING NOW · WHO IS RESPONSIBLE · WHAT SHOULD YOU EXPECT · WHEN SHOULD THIS HAPPEN`). This consistency is what builds trust — the user learns the shape and reads them quickly.

**Typography:** Section labels are `dmx-eyebrow`; body is `text-sm text-zinc-700`. Section separators are 12 px vertical spacing only — no rules between.

---

## 11 · F · Side context (right column)

```
┌────────────────────────────────────────────────┐
│ MONEY SUMMARY                                  │
│   Estimated value     $50,000  (your target)   │
│   Quotation range     $48,000 – $51,200        │
│   Lowest              $48,000  Acme            │
│   Highest             $51,200  Gamma           │
│   Currency            USD 🔒                    │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ DOCUMENTS               4 files       [ + ]    │
│   • spec_v3.pdf         You · Mar 12           │
│   • drawing.dwg         You · Mar 12           │
│   • acme_quote.pdf      Acme · Mar 14          │
│   • gamma_quote.pdf     Gamma · Mar 14         │
│   ▸ All documents                              │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ PARTICIPANTS                            6      │
│   ◯◯◯ + 3 more         [ Manage ]              │
└────────────────────────────────────────────────┘
```

**Money summary** rules:
- Estimated value = sum(`lineItems.quantity` × `lineItems.targetPrice`) — needs target price field on line items (P1 from UX review §4.3).
- Quotation range = computed from all received quotations.
- Always show with `font-variant-numeric: tabular-nums`.
- Currency lock icon = small lock glyph + tooltip.

**Documents** rules:
- Show top 4 most-recent; "All documents" expands inline.
- `[+]` button adds new file (drag-drop, ≤ 50 MB, virus-scan badge).
- Each file shows uploader + date; click opens preview drawer.
- Quotation PDFs auto-uploaded by the platform when supplier submits.

**Participants** rules:
- Compact avatars + count.
- "Manage" only visible to ADMIN or workspace owner.
- Click avatar → mini popover with name, role, organisation, "send clarification" link.

---

## 12 · G · Clarifications (full-width when active)

Promoted from right column to its own full-width row. Existing chat shape is kept but enhanced.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLARIFICATIONS                                       12 messages · 2 new │
│ Visibility: ⦿ All participants  ◯ Private to DeMaxtore admin             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────┐                 │
│  │  Acme Trading · Sourcing Manager · 2h ago           │                 │
│  │                                                      │                 │
│  │  Can you confirm the certification requirement —    │                 │
│  │  is ISO 9001 sufficient or do you also need NSF?    │                 │
│  │                                                      │                 │
│  │  ✓ Seen by you · ✓ Seen by Beta · ✓ Seen by Gamma   │                 │
│  └────────────────────────────────────────────────────┘                 │
│                                                                          │
│                ┌──────────────────────────────────────────────────────┐ │
│                │ You · just now                                        │ │
│                │                                                       │ │
│                │ ISO 9001 is sufficient. NSF is a plus but not a       │ │
│                │ requirement. See attached spec v3 for details.        │ │
│                │                                                       │ │
│                │ 📎 spec_v3.pdf                                         │ │
│                │                                                       │ │
│                │ ✓ Seen by Acme                                        │ │
│                └──────────────────────────────────────────────────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [ @Acme Trading × ]                                                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Type a message… (Cmd+Enter to send)                            │ 📎 │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                       [ Cancel ] [ Send ]│
└─────────────────────────────────────────────────────────────────────────┘
```

**New affordances vs current implementation:**
- **Visibility toggle** at top — choose "All participants" or "Private to DeMaxtore admin" before sending.
- **@mention chip** above the input — buyer can scope a question to one supplier; that supplier is highlighted while others can still read.
- **Inline attachment** — paperclip icon opens file picker; file is added to Documents AND referenced inline.
- **Read receipts** under each message — comma-separated supplier names.
- **Avatar + organisation** above each message (where the supplier persona becomes credible).

**Empty state:**
```
No clarifications yet.
Ask suppliers about specs, lead times, certifications, or sample requests.
All conversations stay inside this workspace.
```

---

## 13 · H · Timeline (collapsed by default)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIMELINE                                          ▾ Last 5 events       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ─── TODAY ──────────────────────────────────────────────────           │
│  ● RFQ entered evaluation                                  14:08         │
│    You started evaluation.                                                │
│  ○ Quotation submitted by Beta                              13:55         │
│  ○ Quotation revised by Acme                                09:22         │
│                                                                          │
│  ─── YESTERDAY ──────────────────────────────────────────────           │
│  ● RFQ deadline reached, quotations closed                  18:00        │
│  ● Quotation submitted by Acme                              11:30        │
│                                                                          │
│  ▸ Show full audit log (28 events)                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Two visual weights:**
- `●` Story events (state changes, PO issuance, supplier selection) — full-weight type, accent dot.
- `○` Activity events (quotations, clarifications, doc uploads) — secondary type, neutral dot.

**Day dividers** are the cheapest improvement; pure visual rhythm.

**Reasons** appear under their event as a quote block:
```
  ● RFQ cancelled by you                                      Mar 12 16:40
    "Specifications changed, will re-issue."
```

**"Show full audit log"** expansion opens an inline list (no separate page) with filter chips: *State changes · Quotations · Clarifications · Documents · Participants*.

---

## 14 · RFQ List page redesign

```
┌────────────────────────────────────────────────────────────────────────────┐
│ RFQ Workspaces                                          [ + Create RFQ ]   │
│                                                                             │
│  ┌──────────────────┬────────────────┬────────────────────┬──────────────┐ │
│  │ ◉ Needs action   │ ○ In progress  │ ○ Awaiting supplier│ ○ Closed     │ │
│  │      3            │      8          │       5             │     12       │ │
│  └──────────────────┴────────────────┴────────────────────┴──────────────┘ │
│                                                                             │
│  [ Search by title …             ]   [ Sort: Newest ▾ ]   [ Filters ⋯ ]   │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ● RFQ-2026-0017  Stainless steel kitchen sinks, 3,000 units                │
│    Under evaluation · 3 of 5 quotations · You need to select a supplier     │
│    Deadline: closed Mar 16 · Last: Beta submitted 2h ago                    │
│    [ Review quotations ] →                                                  │
│                                                                             │
│  ● RFQ-2026-0019  Aluminum extrusion profiles, EU spec                      │
│    Awaiting proforma · Acme · $48,000 · SLA 3 days remaining               │
│    [ Open workspace ] →                                                     │
│                                                                             │
│  ○ RFQ-2026-0015  Custom packaging, food-grade                              │
│    Collecting quotations · 1 of 4 submitted · 23 h to deadline             │
│    Last: Gamma viewed 4h ago                                                │
│                                                                             │
│  ○ RFQ-2026-0014  Power supply units, 500 W                                 │
│    Inviting suppliers · DeMaxtore reviewing supplier list                   │
│    Submitted Mar 11 · 1 d in queue                                          │
│                                                                             │
│  ─── CLOSED ──────────────────────────────────────────────────────────────│
│                                                                             │
│  ○ RFQ-2026-0011  PCB assembly, 1k units                                    │
│    PO issued · Acme · $32,000 · Mar 4                                       │
│    [ Open order workspace ] (Sprint 3)                                      │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Changes from existing table:**
- Top pill bar replaces the state-filter dropdown.
- Card rows replace tabular rows (more breathing room, more context per row).
- `Last activity` becomes a sentence ("Beta submitted 2h ago"), not a timestamp.
- Deadline becomes a humanised countdown chip.
- Quick row CTA on hover (`[Review quotations]`, `[Approve proforma]`) — the row's primary Next Action.
- Empty state (no RFQs at all):
  ```
  Start your first RFQ.
  DeMaxtore matches you with verified manufacturers in 24 hours.
  ① Describe your need  ② We invite suppliers  ③ You compare and select
  [ Create RFQ ]
  ```

---

## 15 · RFQ Create page redesign

### 15.1 New layout — progressive disclosure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Create RFQ                                              [ Use sample ]  │
│ Tell us what to source, and we'll match verified manufacturers.         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ① The basics                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Title                                                              │ │
│  │  e.g. Stainless steel kitchen sinks, 3,000 units, EU market          │ │
│  │                                                                      │ │
│  │  Product category               Target market                        │ │
│  │  [ Kitchen fixtures ▾ ]         [ Europe · Germany × ]               │ │
│  │     ↑ typeahead                  ↑ multi-select                       │ │
│  │                                                                      │ │
│  │  Brief description                                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────┐    │ │
│  │  │ Tip: cover Specifications · Quality standards · Special req. │    │ │
│  │  └──────────────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ② Commercial terms                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Incoterm                Currency          Deadline                  │ │
│  │  [ FOB ▾ ⓘ ]            [ USD 🔒 ]         [ In 1 week ▾ ]            │ │
│  │  hover defs              locked after       quick-picks               │ │
│  │                          submit             "Suppliers typically      │ │
│  │                                              need 5–7 days for         │ │
│  │                                              this category"           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ③ Line items                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Description                Qty   UOM   Target price/u  Notes        │ │
│  │ ─────────────────────────  ───   ───   ──────────────  ─────────    │ │
│  │ Sink model S-201           1500  PCS   $16.00          304 SS        │ │
│  │ Sink model S-205           1500  PCS   $17.00          316 SS        │ │
│  │ [ + Add line ]  [ Paste from Excel ]                                 │ │
│  │ Estimated RFQ value:  $49,500                                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ④ Attachments  (P1 — new in Sprint 2.5)                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │   Drag files here or [ browse… ]                                     │ │
│  │   Spec sheets, drawings, CAD files. PDF, DOCX, DWG, PNG. ≤ 50 MB.   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ⑤ Preview & submit                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Suppliers will see:                                                 │ │
│  │  • Title, category, target market                                    │ │
│  │  • Description, line items (no target prices)                        │ │
│  │  • Incoterm, currency, deadline                                      │ │
│  │  • Attachments                                                       │ │
│  │  They will NOT see: your target prices, your estimated value,        │ │
│  │  your internal notes (any field marked 🔒).                          │ │
│  │                                                                      │ │
│  │  Estimated suppliers: 12 verified manufacturers match your category │ │
│  │                       and target market.                              │ │
│  │                                                                      │ │
│  │  [ Save draft ]                              [ Submit RFQ → ]        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Key changes

- 5 numbered sections, each in a separate card. New users see ① and the rest are collapsed for first-time visit (progressive disclosure).
- **`[Use sample]`** in header pre-fills realistic values for the user's category (mode flag `?demo=1`).
- **Category typeahead** — backed by curated taxonomy. Falls back to free-text when no match.
- **Target market multi-select** — replaces free-text.
- **Deadline coaching** — inline helper text driven by category.
- **Target price column** + estimated RFQ value live total.
- **Attachment zone** — drag-drop, multi-file, virus-scan status badge.
- **Preview block** — shows exactly what the supplier sees vs. what stays private. The single most powerful trust signal in the create flow.
- **Estimated suppliers** count — derived from a backend lookup against the verified supplier graph.

### 15.3 Autosave indicator

Below the Submit button, a small line:
```
✓ Draft saved 4s ago · drafts are private and visible only to you
```

Updates every 8s while the form is dirty.

---

## 16 · Notifications refinements

### 16.1 Severity tiers (locked)

| Tier            | Examples                                            | Channels                          |
| --------------- | --------------------------------------------------- | --------------------------------- |
| **Operational** | RFQ rejected · supplier selected · PO issued        | Toast + bell + email              |
| **Activity**    | Quotation submitted · proforma uploaded             | Toast + bell + (email if first)   |
| **Conversation**| Clarification posted                                | Bell · 15-min digest email        |
| **Deadline**    | T-24h · T-2h · overdue                              | Toast + bell + email              |
| **Background**  | Participant added · system reorg                    | **No notification** — visible in workspace only |

### 16.2 Bell counter shows only Operational + Deadline by default.

A small filter toggle in the drawer lets the user expand to all tiers.

### 16.3 Quiet hours

Per-user setting under `/settings/notifications`. Default 22:00 → 07:00 buyer local time. Deadline notifications override quiet hours.

### 16.4 Grouping

5 clarifications on the same RFQ within 15 min → one bell entry: *"3 new clarifications on RFQ-2026-0017"* → click expands to the list.

---

## 17 · Visual specification — design tokens

| Token                          | Value                                       |
| ------------------------------ | ------------------------------------------- |
| Card border-radius             | 14 px (1rem-ish; matches existing `xl`)    |
| Card padding (workspace cards) | 24 px desktop / 20 px tablet / 16 px mobile |
| Section spacing (vertical)     | 20 px                                       |
| Type · eyebrow                 | 11 px / 14 px line / 0.14em tracking · uppercase · zinc-500 |
| Type · stat value              | Fraunces 32/40 600 · tabular-nums           |
| Type · workspace title         | Fraunces 32/40 600                          |
| Type · primary CTA             | Inter Tight 14/20 600                        |
| Money values                   | always tabular-nums + 1-px monospace tracking|
| State-mood accent (active)     | accent-900 (`#1a237e`)                       |
| State-mood accent (returned)   | red-600                                       |
| State-mood accent (waiting)    | zinc-700                                      |
| Animation · breathing CTA      | 2 s ease-in-out, scale 1.00 → 1.015           |
| Animation · supplier strip refresh | 200 ms slide-fade                          |

---

## 18 · Implementation impact map

For the implementing engineer — what changes vs the current code:

| Existing file / component                                            | Change                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `features/rfq/pages/RfqWorkspacePage.tsx`                            | Rewrite layout per §3                                                    |
| `features/rfq/components/RfqProgressBar.tsx`                         | Rename steps per §5; add sub-state pill                                 |
| `features/rfq/components/RfqNextActions.tsx`                         | Replace vertical button stack with hero-CTA + Action Drawer (§9)         |
| `features/rfq/components/WhatHappensNextCard.tsx`                    | **NEW** — copy table per §6.2                                            |
| `features/rfq/components/SupplierActivityStrip.tsx`                  | **NEW** — §7                                                              |
| `features/rfq/components/SupplierActivityDrawer.tsx`                 | **NEW** — §7.3                                                            |
| `features/rfq/components/QuotationComparisonPanel.tsx`               | **NEW** — §8                                                              |
| `features/rfq/components/WaitingStateCard.tsx`                        | **NEW** — renders §10 copy by state                                       |
| `features/rfq/components/ActionDrawer.tsx`                            | **NEW** — §9.2                                                            |
| `features/rfq/components/MoneySummary.tsx`                            | **NEW** — §11                                                             |
| `features/rfq/components/RfqDocumentsPanel.tsx`                      | Add upload zone + uploader meta                                          |
| `features/rfq/components/RfqClarificationPanel.tsx`                  | Add visibility toggle, @mention chip, attachment, read receipts (§12)    |
| `features/rfq/components/RfqTimeline.tsx`                            | Add day dividers + tier (story/activity) (§13)                            |
| `features/rfq/pages/RfqListPage.tsx`                                  | Replace table with pill+card layout (§14)                                |
| `features/rfq/pages/RfqCreatePage.tsx`                                | Progressive disclosure + attachments + preview (§15)                     |
| `features/notifications/hooks.ts` + drawer                            | Severity tiers (§16)                                                      |
| `@dmx/contracts/rfq.zod.ts`                                           | Add optional `targetPrice` to `LineItemInput`, add `attachmentIds`        |
| `@dmx/contracts/socket-events.ts`                                     | Add `workspace.viewed`, `supplier.activity.updated` events                 |
| Backend `rfq.service.ts`                                              | Emit `workspace.viewed` on supplier first view (idempotent per day)       |
| Backend new endpoint                                                  | `GET /admin/queue/position/:rfqId` for `${pos}`                            |
| Backend new endpoint                                                  | `POST /rfq/:id/nudge` with rate-limit (1/supplier/24h)                     |

---

## 19 · Roll-out plan

### Sprint 2.5 (this redesign) — **2 weeks**

**Week 1 — Hero-tier work**
- D1–2 · Wireframe walkthrough with engineering (this document)
- D3–4 · `WhatHappensNextCard` + `WaitingStateCard` (driven by §6.2 + §10 copy)
- D5    · `SupplierActivityStrip` + backend telemetry for `workspace.viewed`

**Week 2 — Centerpiece + hierarchy**
- D6–7 · `QuotationComparisonPanel` (table + collapsed + empty)
- D8   · CTA hierarchy refactor + `ActionDrawer`
- D9   · Documents upload, Clarifications enhancements (visibility, attachments, read receipts)
- D10  · QA pass + design QA + ship behind feature flag

### Defer to Sprint 3 (NOT in 2.5)
- CommodityBid Workspace
- Order Workspace
- Notification preferences UI
- Per-supplier provenance metadata
- Time-zone display

### Success metrics for Sprint 2.5 (track in week +2)

| KPI                                            | Baseline (estimated) | Target after 2.5  |
| ---------------------------------------------- | -------------------- | ----------------- |
| % first-RFQ submissions completed (Create page)| 35%                  | ≥ 70%             |
| % RFQs where buyer posts ≥ 1 in-platform clarification | 22%          | ≥ 60%             |
| % RFQs where buyer leaves platform to email/WhatsApp (survey) | 71% | ≤ 30%             |
| Median time from `QUOTATIONS_CLOSED` → `SUPPLIER_SELECTED` | 4.2 days | ≤ 1.5 days        |
| Support tickets containing "what now" / "where is" / "how long" | 41% | ≤ 12%       |

---

## 20 · One-page summary for stakeholders

> Sprint 2.5 = **uncertainty reduction layer** for RFQ Workspace.
> Five new components + one layout rule. No FSM changes. No new sprints.
> Outcome: buyers stop leaving the platform.

The five components:
1. **What Happens Next card** — the hero. Answers "what now?" in every state.
2. **Supplier Activity Strip** — the "is anyone working on this?" signal.
3. **Quotation Comparison Panel** — promotes quotations from timeline footnote to centerpiece.
4. **Action Drawer + single Primary CTA** — eliminates the equal-weight button stack.
5. **Waiting State Cards** — explicit copy for every "no action yet" state.

Plus three structural changes:
- Renamed Progress Bar steps (buyer-language, not FSM-language).
- Promoted Clarifications to full-width with read receipts + inline attachments.
- List page reorganised by "needs action / in progress / awaiting / closed".

> Build this before CommodityBid. CommodityBid on a fragile UX foundation is more expensive than rewriting CommodityBid later.

---

**End of Sprint 2.5 wireframe specification.**
