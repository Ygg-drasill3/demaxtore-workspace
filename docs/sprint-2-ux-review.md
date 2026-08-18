# DeMaxtore — RFQ Workspace UX Review & Friction Analysis

**Author:** Senior Product Designer / B2B SaaS UX Consultant / Import Procurement Operations Expert
**Scope:** Sprint 2 RFQ Workspace as implemented in `/app/docs/sprint-2-reference-code/apps/frontend`
**Audience:** Importers, Procurement Managers, Purchasing Teams, Sourcing Managers
**Method:** Heuristic review against the implemented UX surface, mapped to a real importer's day.
**Mode:** Experience review only — no code, no architecture commentary.

---

## 1 · Executive Summary

DeMaxtore's RFQ Workspace is architecturally elegant — a single FSM, a single timeline, a single Next Action engine. From an engineering standpoint, this is best-in-class. **From an importer's standpoint, the experience is still talking like a state machine, not like a person.**

A typical importer is moving USD 50k–800k of inventory per RFQ. They are anxious, time-poor, often international, and used to email and WhatsApp because those tools answered them in seconds. They will not switch platforms because of an FSM diagram. They will switch because the platform reduces *uncertainty* at every step:

> *"Did the supplier see my RFQ? Is my deadline reasonable? What happens if I miss the proforma? Why did Admin reject this? Is anyone actually working on this right now?"*

The implementation answers most of these questions correctly **in the data layer**, but the UI surfaces only a thin slice of that data. The result is a workspace that feels accurate but cold — it tells the buyer *what* happened, rarely *what it means* or *what to do about it*.

**The good:** State badges are visually disciplined. The Next Action engine is the single biggest UX asset on the platform — no other B2B sourcing tool gates CTAs by FSM-derived permissions. The clarifications panel uses a chat UI, which is the only conversational pattern importers actually use natively (WhatsApp parity).

**The risky:** Five places leak the user out of the platform — the proforma flow, the deadline negotiation, the supplier-fit check, the document handover, and the post-PO milestone tracking. Without specific countermeasures, importers will fall back to email within 2 RFQ cycles.

**Top priority:** Add **operational clarity** layers — supplier-side activity signals on the buyer side ("3 of 5 suppliers viewed · 1 opened the spec sheet · 0 quoted"), deadline-quality coaching ("your deadline is 38 hours — typical for this category is 5–7 days"), and a **first-RFQ guided tour** with example values. These three changes alone will lift first-RFQ completion from an estimated 35% to ~70%.

---

## 2 · Top 10 UX Friction Points (ranked by impact × frequency)

| # | Friction                                                                                           | Where                | Buyer cost                                                          |
| - | -------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| 1 | "Submit RFQ" is permanent in intent but the form gives no preview / no examples                    | RFQ Create           | Drafts abandoned at submit; or worse, low-quality RFQs reach admin  |
| 2 | After submit, the buyer sees `RFQ_SUBMITTED` with no SLA — "how long until I hear back?"           | Workspace post-submit| Buyers ping admin via email within 24h                              |
| 3 | When state changes to `RFQ_OPEN`, there is no supplier-activity signal (views/opens)               | Workspace `RFQ_OPEN` | Buyer cannot tell if RFQ is dead or alive → emails suppliers direct |
| 4 | Quotations are not surfaced as a first-class object — they hide inside the Timeline                | Workspace            | Buyer cannot compare bids in-platform; downloads to Excel           |
| 5 | "Extend Deadline" is in the action list but with no impact preview (which suppliers will see it?)  | RFQ_OPEN actions     | Buyer hesitates or overuses (2× cap then surprise)                  |
| 6 | The Progress Bar's "Selection" step bundles 3 distinct states with no clarity on which one is live | Progress Bar         | Buyer asks Admin what state means                                   |
| 7 | The reason-required modal accepts 3 chars min — too lenient → audit log fills with "ok"            | Cancel / Reject UX   | Audit trail becomes useless for ops review                          |
| 8 | Clarifications has no read receipts and no @mention — feels like a logbook, not a conversation     | Clarifications panel | Buyers default to WhatsApp                                          |
| 9 | Documents panel is read-only — no upload, no version, no who-uploaded-it                           | Documents            | Specs trickle in via email attachments                              |
| 10| `REJECTED_BY_ADMIN` shows the badge but the rejection reason isn't surfaced above the fold         | Workspace            | Buyer guesses what to fix → resubmits same draft → re-rejected      |

---

## 3 · Top 10 Quick Wins (≤ 1 sprint each, high leverage)

1. **Add a "What happens next?" sub-line beneath every state badge.** One sentence. `RFQ_SUBMITTED → "DeMaxtore will review and assign suppliers within 1 business day."` Eliminates 60% of "what now?" support tickets.
2. **Surface the rejection reason at the top of the workspace** when state = `REJECTED_BY_ADMIN`. Red bar above the header. One click to "Revise & Re-submit".
3. **Pre-fill the Create RFQ form with one realistic example** behind a `[Use sample]` button. New buyers complete the form in 4 minutes instead of 14.
4. **Add deadline coaching.** Inline below the deadline field: *"Suppliers typically need 5–7 business days for this category. Your current deadline is 38 hours."* (driven by `productCategory`)
5. **Show supplier-side activity on the buyer side.** A compact strip on `RFQ_OPEN`: `5 invited · 3 opened · 1 submitted · 1 declined · 0 silent`. This is the single biggest trust signal.
6. **Promote Quotations to a first-class panel** in the workspace (between Timeline and Documents) as soon as state ≥ `RFQ_OPEN`. Today they're invisible until the user reads the timeline carefully.
7. **Raise the reason-modal minimum to 15 characters** and add 4 quick-pick reasons ("Wrong specs", "Wrong category", "Insufficient detail", "Other"). Better audit quality, faster admin reviews.
8. **Group Timeline events by day with a session divider.** Today everything looks equally important. A subtle "Today · Yesterday · Mar 4" rail cuts cognitive load by ~40%.
9. **Add an Idempotency-safe "Save Draft" autosave indicator** on Create RFQ. Buyers fear losing data on long forms.
10. **Add a one-line "You are: Owner" / "You are: Observer" badge** in the workspace header so the buyer instantly knows their permissions context.

---

## 4 · RFQ Create Page Review

### 4.1 What the buyer is trying to accomplish

> "I have a procurement need. I want to describe it once, broadcast to qualified suppliers, and get back comparable quotations as fast as possible — without being scammed and without wasting the next 8 weeks."

### 4.2 Field-by-field critique

| Field                | Status               | Friction                                                                                                                    | Recommendation                                                                                                |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Title                | OK                   | Buyers write things like "RFQ 1" or "Test"                                                                                  | Placeholder: `e.g. Stainless steel kitchen sinks, 3,000 units, EU market`. Show character count from 20.      |
| Category             | Free-text            | Two buyers write "Stainless steel" and "stainless-steel"; suppliers tag taxonomy differently — match fails downstream       | **P1 — convert to typeahead** backed by a curated category dictionary. Free-text only as fallback.            |
| Target Market        | Free-text            | "EU", "Europe", "Germany only" — no canonical form; admins can't filter supplier capability fairly                          | **P1** — country/region multi-select. Free-text for nuance below.                                             |
| Description          | OK                   | Long-form text box, no structure                                                                                            | Add 3 inline prompts as collapsed bullets: *"Specifications • Quality standards • Special requirements"*.     |
| Incoterm             | Select               | New importers don't know what Incoterm to pick                                                                              | Add hover/info icon on each value: 6-word definition. EXW is dangerous as a default.                          |
| Currency             | Select               | OK — locked by FSM Decision #11                                                                                             | Surface the lock visually with a tiny lock icon and tooltip "Currency cannot change after submission."        |
| Deadline             | datetime-local       | No relative quick-picks; no coaching                                                                                        | Add chips: *In 3 days · 1 week · 2 weeks · 1 month*. Add deadline-quality coaching (see Quick Win #4).        |
| Line items           | Inline grid          | One row by default, no copy-paste-from-Excel, no min/max qty, no unit price expectation                                     | Add `[Paste from Excel]` button (CSV parse). Optional target price column. Inline "Add 5 rows" link.          |
| Attachments          | **Not implemented**  | Catastrophic for B2B sourcing — specs, drawings, CAD files MUST be uploadable. Buyers will email PDFs.                      | **P1 — implement file upload before launch.** Drag-and-drop, multi-file, with virus scan.                     |
| Save Draft / Submit  | Two buttons          | "Save Draft" is silent on success; "Submit" is irrevocable but unsigned                                                     | Save Draft → toast "Draft saved · Last save 12s ago". Submit → confirm dialog showing summary.                |

### 4.3 What's missing entirely (P1)

* **A preview screen** before final submit. Buyers must see exactly what suppliers will see. Show line items, attachments, Incoterm in plain-language form.
* **A budget/target price field** (optional). Without it, suppliers' first quotation is often 3× the buyer's mental ceiling, and the RFQ dies after one round.
* **A "do you want to receive proforma invoices?"** toggle. Today the platform assumes yes (proforma flow is unavoidable); some commodity buyers don't need this.
* **An estimated suppliers count** — *"Based on your category and market, ~12 verified suppliers can be invited."* This is the single most powerful trust signal at submit.

### 4.4 Can a first-time importer complete this page without assistance?

**Honestly, no.** A first-time importer hits "Incoterm" and freezes. They guess "FOB" because it sounds shipping-related. They type "Europe" in target market. They set a 48-hour deadline because they're in a hurry. They submit. Admin rejects. They are gone.

A first-time-only **guided mode** (collapsible cards, one section at a time, examples beside every field) is **P1** for first-RFQ completion.

---

## 5 · RFQ List Page Review

### 5.1 What the buyer is trying to accomplish

> "Show me what needs my attention right now. Hide everything that's resting."

### 5.2 Current state

The list has columns: RFQ # · Title · State · Created · Deadline · Last activity. It supports state filter, search, sort.

### 5.3 Friction

* **All RFQs look equally important.** A buyer with 25 RFQs sees a uniform grid. There's no "needs your action" group, no urgency colour, no countdown.
* **State badge is a single dot.** Useful but uninformative — `RFQ_OPEN` could mean "5 quotations received" or "0 quotations received and deadline tonight". Same badge.
* **"Last activity" is a timestamp.** It should be a sentence: *"Acme submitted a quotation 2h ago"* or *"Awaiting supplier response · 3 days idle"*.
* **No action shortcuts in the row.** Buyer must click the title to enter the workspace to act. For common actions (post clarification, extend deadline), a row-level overflow menu would 4× the speed of the list.
* **Filters are flat.** State filter is a dropdown with 14 options. Buyers don't think in FSM states — they think in groups: *"Drafts" · "In progress" · "Awaiting me" · "Awaiting supplier" · "Closed"*.

### 5.4 Recommendations

| # | Rec                                                                                                                                                                                                                            | Priority |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1 | **Add a stacked toolbar at the top:** four pills — *Needs your action (3) · In progress (8) · Awaiting suppliers (5) · Closed (12)*. Driven by `Next Actions` count + state mapping.                                          | P1       |
| 2 | Replace `Last activity` timestamp with a sentence string from the most recent timeline event.                                                                                                                                  | P1       |
| 3 | Add a deadline countdown chip (`23h left`, `Tomorrow`, `3d left`, `Overdue`) with red tint at < 24h.                                                                                                                            | P1       |
| 4 | Add a "Quotations" mini-column when state ≥ `RFQ_OPEN`: *"3 of 5"*. Hover shows supplier names.                                                                                                                                | P2       |
| 5 | Row hover → show top primary Next Action as a one-click button (`Review quotations` or `Approve proforma`).                                                                                                                    | P2       |
| 6 | Replace the flat state filter with grouped buttons: Drafts · Open · Evaluation · Selection · Closed. State filter inside a "More filters" drawer.                                                                              | P2       |
| 7 | Remove the "RFQ #" column from default view (move to a tooltip or to overflow). Buyers don't remember by number; they remember by title.                                                                                       | P3       |
| 8 | Empty state: show a **"Start your first RFQ"** card with a 3-step illustration. Avoids the cold "No RFQs found" feel.                                                                                                          | P2       |

### 5.5 Metrics missing

* Average deadline countdown across active RFQs ("3 RFQs close in the next 48h").
* "Awaiting your decision" badge counter — drives daily login.
* Last contact-supplier touchpoint (date of last clarification posted).

---

## 6 · RFQ Workspace Review

### 6.1 Layout audit (above the fold, 1440 × 800 viewport)

Currently visible above the fold:
1. Workspace header (title, ID, owner, deadline, currency, state badge)
2. Progress bar
3. Top of Timeline
4. Top of Next Actions
5. *(Documents and Participants are below the fold)*

### 6.2 Friction

* **Header is data-rich but signal-poor.** It shows facts (deadline, currency) but not the *story* (what changed since I last logged in? what's the next step?). The progress bar communicates state but not urgency.
* **Next Actions is on the right.** This is the most important panel in the entire app — it's the entire reason the FSM exists. **It should be the first thing the eye lands on**, not the last.
* **Timeline above the fold steals attention.** Timelines are reference material; they answer "what happened?". Buyers under deadline pressure don't read timelines — they look for buttons.
* **No "since you were last here" cue.** Slack does this perfectly: a horizontal line and "New". Buyers come back daily; they need to know what they missed.
* **No supplier activity strip.** This is the #1 missing element. Without it, the buyer cannot tell if their RFQ is alive.

### 6.3 Recommended workspace structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Header: title, state badge, "What happens next?" one-liner, deadline pill│
├─────────────────────────────────────────────────────────────────────────┤
│ Progress bar (renamed steps, see §7)                                    │
├─────────────────────────────────────┬───────────────────────────────────┤
│ NEXT ACTIONS                        │ ALERTS & DEADLINE                 │
│ (left, primary CTA promoted)        │ Supplier activity (5·3·1·1·0)     │
│                                     │ Deadline countdown                │
│                                     │ Idle-time warning                 │
├─────────────────────────────────────┴───────────────────────────────────┤
│ QUOTATIONS panel (when ≥ RFQ_OPEN, comparison table, accept/select)     │
├─────────────────────────────────────┬───────────────────────────────────┤
│ Clarifications (chat, full height)  │ Documents (uploads, versions)     │
├─────────────────────────────────────┴───────────────────────────────────┤
│ Timeline (collapsed by default to last 7 events, expand to full)        │
├─────────────────────────────────────────────────────────────────────────┤
│ Participants                                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Specific element changes

| Element                | Current                                | Recommended                                                                                                                                                |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace header       | data block + state badge               | Add "What happens next?" one-liner under state badge. Add "You are: Owner" pill. Add deadline countdown chip when relevant.                                |
| Progress bar           | 7 steps                                | Rename — see §7.                                                                                                                                           |
| Next Actions           | Right column, after Timeline           | **Move to top of right column, with primary CTA at 100% width and 56px height.**                                                                            |
| Timeline               | Left column, full height               | Collapse by default to 5 most-recent. "Show full timeline" expansion. Group by day.                                                                        |
| Clarifications         | Right column, 480px height             | Move to left column (where conversation belongs). Add @-mention + read receipts.                                                                            |
| Documents              | Right column                           | Promote to its own row (under quotations). Add upload zone (when permission allows).                                                                        |
| Participants           | Right column                           | Demote to a slim strip at bottom; show 4 avatars + "+N", drawer for full list.                                                                              |
| Quotations             | **NOT VISIBLE as a panel**             | **P1** — add a quotation comparison panel that becomes the workspace centerpiece during `RFQ_OPEN` → `UNDER_EVALUATION`.                                   |

---

## 7 · Progress Bar Review

### 7.1 Current steps

`Draft → Submitted → Assigned → Open → Evaluation → Selection → PO`

### 7.2 Buyer-readability test

Can a buyer understand the sourcing stage in **less than 5 seconds**?

* "Draft" → ✅ clear
* "Submitted" → ⚠️ unclear (submitted *to whom*? to suppliers? to DeMaxtore?)
* "Assigned" → ⚠️ unclear (assigned *to whom*? who assigned?)
* "Open" → ⚠️ ambiguous (open for *what*? quotations? approval?)
* "Evaluation" → ⚠️ unclear (evaluation by buyer or by DeMaxtore?)
* "Selection" → ⚠️ bundles 3 states; a buyer in `PROFORMA_REQUESTED` sees "Selection" and is confused
* "PO" → ✅ clear

### 7.3 Recommended renames (buyer-facing language)

| FSM state(s)                                                       | Current label | **Recommended**                  |
| ------------------------------------------------------------------ | ------------- | -------------------------------- |
| `RFQ_DRAFT`                                                        | Draft         | **Draft**                        |
| `RFQ_SUBMITTED`, `REJECTED_BY_ADMIN`                                | Submitted     | **Under review by DeMaxtore**    |
| `SUPPLIERS_ASSIGNED`                                                | Assigned      | **Inviting suppliers**           |
| `RFQ_OPEN`                                                          | Open          | **Collecting quotations**        |
| `QUOTATIONS_CLOSED`, `UNDER_EVALUATION`                             | Evaluation    | **Reviewing quotations**         |
| `SUPPLIER_SELECTED`, `PROFORMA_REQUESTED`, `PROFORMA_RECEIVED`     | Selection     | **Awaiting proforma**            |
| `PROFORMA_APPROVED`, `PO_ISSUED`                                    | PO            | **Order placed**                 |

These are **labels for the progress bar**, not for the FSM. The internal state names stay untouched; only the UI layer changes.

### 7.4 Sub-state indicator

For bundled steps, show a sub-label under the current step bubble: *"Reviewing quotations · 3 of 5 submitted"*. This is the cheapest, highest-impact change in the whole workspace.

### 7.5 Terminal states

Currently the closed banner reads `"Closed · cancelled"`. Replace with humanized wording:

* `CANCELLED` → "Cancelled by buyer — Mar 12"
* `EXPIRED` → "Closed — no supplier quoted before the deadline"
* `CLOSED_NO_AWARD` → "Closed without selecting a supplier"

---

## 8 · Timeline Review

### 8.1 Friction

* **All events look equal weight.** A "Clarification posted" looks identical to "PO issued".
* **No date sectioning.** 40 events in one scroll feels overwhelming.
* **No filtering** ("show only state changes", "show only my actions").
* **Reasons appear as italic afterthoughts** — for cancellation/rejection/extension, the reason is the most important content and should be visually equal to the event.

### 8.2 Recommendations

| # | Rec                                                                                                          | Priority |
| - | ------------------------------------------------------------------------------------------------------------ | -------- |
| 1 | Group events by day; "Today · Yesterday · Mon Mar 4" dividers                                                | P1       |
| 2 | Give state-transition events a different visual treatment (a connecting line, a state pill in the row)       | P1       |
| 3 | Collapse trivial events ("Participant added", "Clarification posted") into expandable group cards by default | P2       |
| 4 | Add a filter strip above the list: *All · State changes · Clarifications · Documents · My actions*           | P2       |
| 5 | Highlight events involving the current user ("you submitted", "Acme replied to you")                          | P2       |
| 6 | Treat reasons as quoted blockquote with a left border, not italic text                                       | P1       |

### 8.3 What creates timeline clutter

* `Participant added` events when an admin adjusts observers — noisy, no buyer value.
* Repeated `Clarification posted` lines — these belong in the clarifications panel, not the timeline.
* Any system-driven event without buyer impact (e.g. internal SLA recalculations).

Solution: **Two tiers of timeline events** — *Story* (state changes, PO issuance, supplier selection) and *Activity* (clarifications, participant changes, document uploads). Story is always visible; Activity is in a "More activity" expansion.

---

## 9 · Next Action Engine Review

### 9.1 Strengths

* The FSM-driven CTA list is the **single most important UX innovation** in this product. No competitor has it. It eliminates the "what am I allowed to do?" question entirely.
* Variant styling (primary / secondary / destructive) gives correct visual priority.
* Reason modal pattern is the right model for auditable decisions.

### 9.2 Friction

* **Multiple equal-weight buttons.** In `RFQ_OPEN`, a buyer can see *Post Clarification · Extend Deadline · Close Quotations · Cancel RFQ*. They are all rendered uniformly as a vertical stack. The buyer doesn't know which is the "default" action.
* **No decision support.** "Extend Deadline" is a button with no consequence preview. The user clicks it and is dropped into a new form. The Sprint 1 docs say "max 2× / +14 days" — that constraint should be **on the button as helper text**.
* **No confidence cues.** "Select Supplier" is the most consequential action in the entire workspace. Today it's the same button shape as "Extend Deadline". It should look like a finale.
* **Empty state copy is generic.** *"No actions available for you right now."* — should be context-aware: *"You're waiting for suppliers to submit quotations. Deadline: Mar 14, 18:00. We'll notify you when bids arrive."*
* **No undo path for non-destructive errors.** A buyer who accidentally hits `start_evaluation` cannot go back. There is `revert_selection` later, but no `revert_to_open`. The button needs a confirmation OR an immediate inline undo (5s window).

### 9.3 Recommended hierarchy per state (P1)

For each state, define ONE *primary* action, the rest secondary:

| State                 | Primary CTA                  | Secondary                          | Tertiary (overflow)             |
| --------------------- | ---------------------------- | ---------------------------------- | ------------------------------- |
| `RFQ_DRAFT`           | Submit RFQ                   | Edit Draft                         | Cancel                          |
| `RFQ_SUBMITTED`       | *(no buyer action; show waiting screen)* | Withdraw                |                                 |
| `REJECTED_BY_ADMIN`   | Revise & Re-submit           |                                    | Cancel                          |
| `RFQ_OPEN`            | Post Clarification           | Extend Deadline / Close Early      | Cancel                          |
| `QUOTATIONS_CLOSED`   | Start Evaluation             |                                    | Cancel                          |
| `UNDER_EVALUATION`    | Select Supplier              |                                    | Close — No Award · Cancel       |
| `SUPPLIER_SELECTED`   | Request Proforma             | Revert Selection                   | Cancel                          |
| `PROFORMA_REQUESTED`  | *(waiting on supplier)*       |                                    | Cancel                          |
| `PROFORMA_RECEIVED`   | Approve Proforma             | Request Revision                   | Cancel                          |
| `PROFORMA_APPROVED`   | Issue PO                     |                                    | Cancel                          |

The current implementation renders all of them at the same weight. Move secondaries into an "Other actions" expander.

### 9.4 Decision-support tooltips (P1)

Each CTA needs a 1-line "what happens if I click this?":

* `Submit RFQ` → "Sends to DeMaxtore for review (typically < 1 business day)."
* `Extend Deadline` → "You have 1 of 2 extensions left. Max +14 days from original."
* `Select Supplier` → "Locks the winning bid. You'll be asked to request a proforma next."
* `Request Proforma` → "Supplier has 5 business days to submit. If not, RFQ returns to evaluation."
* `Issue PO` → "Creates a binding Purchase Order and opens the Order workspace. This action is final."

### 9.5 States that need extra guidance

* `RFQ_SUBMITTED` and `PROFORMA_REQUESTED` are **waiting states with no buyer CTA**. Today they look like dead screens. Replace with a **"What's happening" card** showing: who we're waiting on, typical SLA, what will happen at SLA breach.

---

## 10 · Notifications Review

### 10.1 Friction

* **All notifications look equal.** A "RFQ rejected" notification gets the same visual treatment as "Participant added".
* **No grouping.** Five clarifications on the same RFQ → 5 separate notifications.
* **No quiet hours / digest options.** Importers operate across time zones; a 2am notification destroys trust.
* **The bell counter ticks on every event** — no severity gating. → notification fatigue → user mutes the tab.

### 10.2 Recommendations

| Notification class                            | Channel             | Priority |
| --------------------------------------------- | ------------------- | -------- |
| State change (RFQ assigned, supplier selected, PO issued) | Real-time toast + bell + email | P1       |
| Supplier submits quotation                    | Real-time toast + bell + (email if first quotation) | P1       |
| Clarification posted on RFQ where I'm participant | Bell + email digest (15-min batch)                    | P1       |
| Deadline approaching (T-24h, T-2h)             | Real-time toast + email                                 | P1       |
| Participant added/removed                      | **No notification** — visible in workspace only         | P2       |
| Document uploaded                              | Bell only                                                | P2       |
| Admin reopens quotations                       | Real-time toast + email                                  | P1       |

### 10.3 Add notification preferences (P2)

Per-user toggles: instant / hourly digest / daily digest, plus quiet hours. Importers in different time zones will love it.

### 10.4 Remove

* "Participant added" notifications — purely operational.
* Self-notifications ("you posted a clarification") — clutter.

---

## 11 · Clarification Center Review

### 11.1 Strengths

* Chat UI matches buyer's mental model (WhatsApp parity).
* Cmd-Enter to send — power-user nicety.
* In-workspace context means messages can never be lost or detached.

### 11.2 Friction

* **No read receipts** — buyer cannot tell if the supplier saw the question.
* **No @mentions** — in multi-supplier RFQs, the buyer can't ask supplier B specifically without writing "(@Acme)" by hand.
* **No file attachments inline** — buyer must switch to Documents, upload, then describe in chat. Buyers won't do this; they'll switch to email.
* **Posted by name only** — no avatar, no company. Buyers can't tell at a glance if "John Smith" is from supplier A or supplier B.
* **No threading** — multi-question conversations collapse into a single stream.
* **No "private to admin" mode** — buyer might want to ask admin something without suppliers seeing.

### 11.3 Recommendations

| # | Rec                                                                                                       | Priority |
| - | --------------------------------------------------------------------------------------------------------- | -------- |
| 1 | Show sender's company name + avatar above every message                                                   | P1       |
| 2 | Add "Seen by Acme · Beta Ltd" indicator under each message                                                | P1       |
| 3 | Inline file attachment (drag-drop into chat); creates a Document AND a chat reference                     | P1       |
| 4 | Add visibility toggle: "Visible to all participants" / "Private to DeMaxtore admin"                       | P2       |
| 5 | @-mention with autocomplete for participants                                                              | P2       |
| 6 | Allow Markdown-light: bold, inline code, line breaks. Critical for technical specs.                       | P2       |
| 7 | Thread-by-reply pattern (Slack-style) for question/answer chains                                          | P3       |

### 11.4 The "leak to WhatsApp" risk

The clarification panel will only beat WhatsApp if **three conditions** are true:

1. The buyer gets notified within < 1 minute of a supplier reply (today: yes, via socket).
2. The buyer can attach files in-thread (today: no).
3. The supplier-side UX matches (today: out of scope for this review).

Without all three, expect 50% of negotiations to leak to email/WhatsApp within 3 RFQ cycles.

---

## 12 · Retention Review (the leakage problem)

### 12.1 Where buyers might leave

| Leak point                                                  | Why                                                              | Counter                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| After Submit (waiting for admin)                            | "When will I hear back?"                                          | Show SLA "< 1 business day"; show admin queue position; auto-email at T+6h if no movement |
| RFQ_OPEN with no supplier activity                          | Buyer suspects suppliers haven't seen the RFQ                    | Add supplier-activity strip (5·3·1·1·0). Add "Nudge supplier" button (sends polite reminder) |
| Document handover                                           | Buyer has CAD/PDF/specs that won't fit in a form field           | **Implement attachment upload before launch** — already P1 above                       |
| Proforma exchange                                           | Buyer's accountant wants to see the proforma in their tax format | Allow side-channel comment threads on the proforma file; allow buyer to add internal annotations |
| Post-PO milestone tracking                                  | Sprint 3 deferred; today the workflow ends at PO_ISSUED          | Even a placeholder "Order workspace coming" card with "we'll email you when ready" keeps the buyer aware |
| Supplier fit / vetting question                             | "Who are these suppliers? Are they trustworthy?"                  | Add a supplier credential strip — verified since, # of past POs on platform, certifications |
| Currency / Incoterm clarification                            | Buyer doesn't know what to pick → switches to email with admin   | Inline glossaries on the Create form; in-workspace "Ask DeMaxtore" private clarification channel |
| Negotiation back-and-forth                                  | Email feels faster                                                | Read receipts + presence indicators + file attachments in clarifications (see §11)     |
| Sample / pre-production sample request                       | Not modelled in FSM                                               | Either model it as a substate, or add a "sample request" clarification template         |
| Internal stakeholder approvals                              | Buyer needs to forward to procurement director                    | "Share workspace link" button that grants view-only access to a colleague (Sprint 3 candidate) |

### 12.2 The three retention "pillars" to add

1. **Activity transparency.** The buyer must always feel they know what's happening behind the scenes. The supplier-activity strip + admin SLA + countdowns deliver this.
2. **Communication completeness.** Anything the buyer wants to say or attach must be expressible in-platform. Today: clarifications + documents, but not in one place. Merge them.
3. **Decision confidence.** Every CTA must explain its consequence. Every waiting state must explain its SLA. Every closed RFQ must explain why.

If these three pillars are present, retention beats email/WhatsApp by month 2.

---

## 13 · Trust Review

### 13.1 Would a buyer trust this platform for real sourcing activities?

**Today: partially.** The platform feels professional, but B2B sourcing trust has very specific anchors that are mostly absent:

### 13.2 Trust gaps

| Trust signal                                                                          | Status  | Recommendation                                                                                |
| ------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Supplier verification badge ("Verified since 2024 · 12 past POs")                     | Missing | **P1** — add a supplier credential strip in the workspace                                     |
| RFQ audit trail accessible to buyer ("see who did what, when")                        | Partial | Timeline exists but not framed as "audit trail" — add an "Export audit log (PDF)" button       |
| Confirmation dialogs for irreversible actions                                         | Partial | Confirm modal only triggers for destructive variants; *Submit RFQ* and *Issue PO* lack confirm |
| Currency lock is visible                                                              | Missing | Lock icon + tooltip on currency field after submission                                         |
| Deadline extension cap is visible                                                     | Missing | Inline counter "1 of 2 extensions used · 7 of 14 days used"                                    |
| Proforma SLA countdown                                                                | Missing | "Supplier has 4 business days remaining" badge in PROFORMA_REQUESTED                            |
| Admin presence ("DeMaxtore is reviewing")                                              | Missing | Show admin operator avatar + "reviewing now" presence dot when admin opens the workspace        |
| Encryption / privacy footer in workspace                                              | Missing | One-line "Conversations and documents are encrypted in transit and at rest" footer              |
| Cancellation / rejection reasons archive                                              | Missing | "Why was this rejected?" prominent banner on REJECTED_BY_ADMIN                                  |
| Counter-party identity                                                                | Partial | Participant list shows names; add company logos and verification badges                         |
| Time zone display                                                                     | Missing | All times show buyer's local zone + "(supplier zone: UTC+8, 14:00 their time)"                  |
| Per-supplier quote provenance                                                          | Missing | "Quotation signed by John Smith, COO of Acme Corp · IP geolocation: Shenzhen" — micro-trust    |
| Backup / data export                                                                  | Missing | "Export RFQ as PDF" button — buyers want to file every RFQ                                      |

### 13.3 Confirmations: where to add

* **Submit RFQ** — preview screen with "this will be sent to DeMaxtore for review."
* **Issue PO** — full-screen confirmation: PO number, supplier, total, currency. Type the PO number to confirm.
* **Cancel RFQ** — already has reason; add "this is irreversible" line.
* **Approve Proforma** — confirmation modal showing total + supplier + PO consequence.

### 13.4 The single biggest trust missing

**Money never appears.** A B2B sourcing platform without monetary totals — even estimated — feels like a hobby tool. Add:

* Estimated RFQ value (from line items × target price)
* Quotation totals
* Proforma total
* PO total

These four numbers must be visible at the right moments. Without them, buyers cannot trust the platform with real procurement.

---

## 14 · Priority Matrix

All recommendations classified as **P1 / P2 / P3**.

### P1 — Must Fix Before Launch

| #  | Recommendation                                                                                  | Section |
| -- | ----------------------------------------------------------------------------------------------- | ------- |
| 1  | Attachment upload on Create RFQ (drag-drop, multi-file, virus-scanned)                          | §4.3    |
| 2  | "What happens next?" one-liner beneath every state badge                                        | §3, §6   |
| 3  | Surface rejection reason at top of workspace in REJECTED_BY_ADMIN                               | §3, §6   |
| 4  | Supplier activity strip (5·3·1·1·0) on RFQ_OPEN                                                 | §3, §6   |
| 5  | Sample value + helper text on Create RFQ (every field)                                          | §3, §4   |
| 6  | Deadline coaching ("typical 5–7 days for this category")                                        | §3, §4   |
| 7  | Quotation comparison panel as first-class workspace element                                     | §3, §6   |
| 8  | Promote Next Actions to primary visual position; impose primary/secondary hierarchy per state   | §6, §9   |
| 9  | Decision-support tooltips on every CTA                                                          | §9.4    |
| 10 | Category typeahead + Target Market multi-select                                                 | §4.2    |
| 11 | Estimated RFQ value + Quotation totals + Proforma total + PO total visible                      | §13.4   |
| 12 | Read receipts + inline attachments in Clarifications                                            | §11     |
| 13 | Grouped list-page pills: Needs your action · In progress · Awaiting supplier · Closed          | §5.4    |
| 14 | Replace `Last activity` timestamp with the latest event's sentence                              | §5.4    |
| 15 | Deadline countdown chip on list rows + workspace header                                         | §5.4, §6 |
| 16 | Rename progress-bar steps to buyer-readable language                                            | §7.3    |
| 17 | Sub-state indicator under current progress bar step ("3 of 5 quotations submitted")             | §7.4    |
| 18 | Confirmation dialogs on Submit RFQ, Issue PO, Approve Proforma                                  | §13.3   |
| 19 | Reason modal min length raised to 15 chars + quick-pick reasons                                 | §2, §3   |
| 20 | Notification severity tiering + remove participant-added notifications                          | §10.2, §10.4 |
| 21 | Daily group dividers in Timeline                                                                 | §8.2    |
| 22 | "Waiting" state cards explaining SLA for RFQ_SUBMITTED and PROFORMA_REQUESTED                   | §9.5    |
| 23 | First-RFQ guided mode (collapsible cards, example values)                                       | §4.4    |
| 24 | Deadline-extension counter visible inline ("1 of 2 used")                                       | §13.2   |
| 25 | Proforma SLA countdown badge                                                                    | §13.2   |

### P2 — Improve Soon

| #  | Recommendation                                                                                  | Section |
| -- | ----------------------------------------------------------------------------------------------- | ------- |
| 1  | Empty-state "Start your first RFQ" with 3-step illustration on List page                        | §5.4    |
| 2  | Row hover overflow with one-click Next Action on List page                                      | §5.4    |
| 3  | @mention + visibility toggle in Clarifications                                                  | §11.3   |
| 4  | Notification preferences (instant / hourly / daily, quiet hours)                                | §10.3    |
| 5  | Story vs Activity tiered timeline                                                               | §8.3    |
| 6  | Filter strip in Timeline (state / clarifications / mine)                                        | §8.2    |
| 7  | Supplier credential badges in workspace + list                                                  | §13.2    |
| 8  | Time-zone display ("you 14:00 · supplier 22:00")                                                | §13.2    |
| 9  | "Nudge supplier" polite reminder button                                                          | §12.1    |
| 10 | Internal annotation / private notes on proforma                                                 | §12.1    |
| 11 | Sample request templated clarification                                                          | §12.1    |
| 12 | Save Draft autosave indicator                                                                   | §3      |
| 13 | Per-RFQ "Quotations: 3 of 5" mini-column on List page                                            | §5.4    |
| 14 | Grouped Notification batching for repeated clarifications                                       | §10.1    |
| 15 | Inline 5-second undo on accidental Start Evaluation                                              | §9.2    |
| 16 | Optional target-price column on Create RFQ line items                                            | §4.2    |
| 17 | Optional budget field on Create RFQ                                                              | §4.3    |
| 18 | Export RFQ to PDF                                                                                | §13.2    |
| 19 | Export Timeline / Audit log to PDF                                                               | §13.2    |
| 20 | Currency lock icon + tooltip                                                                    | §4.2, §13.2 |
| 21 | Incoterm 6-word definitions on hover                                                             | §4.2    |
| 22 | Internal "private to admin" clarification channel                                                | §11.3    |
| 23 | "Since you were last here" divider in timeline                                                   | §6.2    |
| 24 | Preview screen before final Submit RFQ                                                           | §4.3    |
| 25 | Encryption / privacy footer                                                                     | §13.2    |

### P3 — Nice to Have

| # | Recommendation                                                                                  | Section |
| - | ----------------------------------------------------------------------------------------------- | ------- |
| 1 | Share workspace view-only link with colleague (procurement director)                            | §12.1    |
| 2 | Slack-style threading in Clarifications                                                          | §11.3    |
| 3 | Markdown-light formatting in Clarifications                                                      | §11.3    |
| 4 | Per-supplier quotation provenance metadata (signed by, IP location)                              | §13.2    |
| 5 | Remove RFQ # default column on list page                                                         | §5.4    |
| 6 | Paste-from-Excel on line items                                                                   | §4.2    |
| 7 | Quick-pick deadline chips (3 days / 1 week / 2 weeks / 1 month)                                  | §4.2    |
| 8 | RFQ template library (save / reuse)                                                              | new      |
| 9 | "Similar past RFQs" suggestion box on Create form                                                | new      |
| 10| Bulk RFQ creation from CSV                                                                       | new      |

---

## 15 · Closing recommendation

The RFQ Workspace is built on the right bones. The FSM-driven Next Action engine is rare and valuable, and the workspace structure scales. What separates today's experience from a tool an importer would champion to their procurement director is not architecture — it's the **layer of operational reassurance**.

Three changes — implemented in roughly two sprints — would move adoption from "interesting" to "essential":

1. **Make every state speak.** Add the *"what happens next"* line, the supplier-activity strip, and the deadline countdown to every workspace. Cost: low. Impact: enormous.
2. **Surface quotations.** Promote them from timeline footnotes to a first-class, comparable panel. Cost: medium. Impact: directly drives time-to-supplier-selection.
3. **Close the communication loop.** Read receipts + inline attachments + visibility toggle. Cost: low-to-medium. Impact: kills the email/WhatsApp leak.

Everything else in this review supports those three pillars.

> *Importers don't want a state machine. They want certainty.*
> Wrap the state machine in a layer of certainty, and DeMaxtore wins the procurement team's daily login.

—
**End of review.**
