# Accepted Operational Debt

**Recorded:** 2026-06-03  
**Gate:** Product Readiness Audit v2 → Sprint 3C entry approved  
**Policy:** These items are **not Sprint 3C blockers**. They must not be forgotten before production go-live.

---

## 1. Email delivery

| Field | Value |
|-------|--------|
| **Status** | Code complete; production delivery deferred |
| **Today** | `mailer.ts` + templates + `EMAIL_PROVIDER` (`console` \| `resend` \| `smtp`) |
| **Pilot** | Console logging acceptable |
| **Production** | Activate Resend or SMTP + env (`RESEND_API_KEY` or `SMTP_*`) |
| **Sprint 3C** | No change required unless freight events need new template keys |

---

## 2. Public signup / account provisioning

| Field | Value |
|-------|--------|
| **Status** | No self-registration API |
| **Pilot** | Admin provisioning or `prisma:seed` dev accounts sufficient |
| **Production** | User onboarding product (invite flow, org signup) — future sprint |
| **Sprint 3C** | No blocker |

---

## Review trigger

Revisit this file before:

- First paying customer pilot
- Production deployment checklist
- Product Readiness Audit v3 (post–Sprint 3C)
