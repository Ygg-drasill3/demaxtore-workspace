# DeMaxtore Turkey Paid Pilot — Friction Log

**Use:** One entry per real operational problem. This is the **raw data** for Sprint 43 prioritization — not internal guesswork.

**Do not open development during pilot for P2 cosmetic items.** Log P1 friction here instead.

---

## How to log

When something slows the customer, Ops, broker, or trucker:

1. Add a row below (copy blank row).
2. Record **operator minutes** honestly (including coordination time).
3. Set **severity**: P0 (stop pilot) · P1 (continue, measure) · P2 (cosmetic — log only, no sprint).
4. Mark **Repeated?** when the same friction appears on another transaction.

**P0 → escalate Engineering / stop new onboarding per playbook.**

---

## Friction entries

| Date | Transaction (PO / marker) | Stage | Role | Problem | Customer impact | Ops workaround | Operator min | Severity | Repeated? | Engineering? |
|------|---------------------------|-------|------|---------|-----------------|---------------|--------------|----------|-----------|--------------|
| | | | | | | | | P1 | ☐ | ☐ |

---

## Blank row (copy/paste)

```
| Date | Transaction (PO / marker) | Stage | Role | Problem | Customer impact | Ops workaround | Operator min | Severity | Repeated? | Engineering? |
|------|---------------------------|-------|------|---------|-----------------|---------------|--------------|----------|-----------|--------------|
|      |                           |       |      |         |                 |               |              | P1       | ☐         | ☐            |
```

---

## Field guide

| Field | Guidance |
|-------|----------|
| **Stage** | e.g. PO → Freight, Broker discovery, TLC view, Line allocation |
| **Role** | Buyer / DeMaxtore Ops / Broker / Trucker |
| **Problem** | What actually happened (one sentence) |
| **Customer impact** | Low / Medium / High — or short note |
| **Ops workaround** | What you did in supported UI |
| **Operator min** | Minutes spent (this event) |
| **Severity** | P0 / P1 / P2 |
| **Repeated?** | Same friction on another shipment |
| **Engineering?** | Did you need DB/API/dev? (should be **No** on Golden Path) |

---

## Example (delete when real entries exist)

| Date | Transaction | Stage | Role | Problem | Customer impact | Ops workaround | Operator min | Severity | Repeated? | Engineering? |
|------|-------------|-------|------|---------|-----------------|----------------|--------------|----------|-----------|--------------|
| 2026-08-16 | PO-MST… | PO → Freight | DeMaxtore Ops | Buyer cannot self-serve freight request | Low | Admin UI freight request | 4 | P1 | ☐ | No |

---

## Sprint 43 candidacy (review after Customer #1–#3)

Promote to backlog discussion only when evidence shows:

- Same **Stage + Problem** on **≥3** transactions, **or**
- **Operator min** median **≥10** for one stage, **or**
- **Customer impact** High on **≥2** customers, **or**
- Security/data integrity (→ incident remediation, not feature sprint)

Summarize patterns here when ready:

| Pattern | Count | Total operator min | Proposed owner | Sprint candidate? |
|---------|-------|-------------------|----------------|-------------------|
| | | | | ☐ |
