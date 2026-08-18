# Sprint 2.9 — Messaging & Delivery Sprint Report

**Status:** ✅ Complete
**Date:** 2026-06-03
**Provider in use:** `EMAIL_PROVIDER=console` (default; ready to flip to `resend` via env)
**Approved scope:** operational email only — forgot-password, proforma SLA reminder, critical notification fallback.

---

## What was delivered

| Item | Status |
|---|---|
| `EmailProvider` abstraction (single interface) | ✅ |
| `console` impl — logs rendered HTML+text (default) | ✅ |
| `resend` impl — calls Resend SDK, env-gated | ✅ |
| `smtp` impl — nodemailer transport, env-gated | ✅ |
| Auto-fallback to console when chosen provider can't init | ✅ |
| `mailer.send()` and `mailer.sendAsync()` helpers (fire-and-forget) | ✅ |
| 3 templates: `forgot-password`, `proforma-sla-reminder`, `notification-fallback` (vanilla HTML, inline CSS, table layout) | ✅ |
| `auth.service.forgotPassword()` now sends a real email through `mailer` | ✅ |
| `applyTransition()` critical-notification fallback — emails on **5 events** (allowlist) | ✅ |
| Prisma migration `add_last_sla_reminder_at` (idempotency for SLA cron) | ✅ |
| In-process SLA worker (`startSlaWorker()`) running every 15 min | ✅ |
| DNS / SPF / DKIM checklist doc — `/app/docs/email-dns-setup.md` | ✅ |
| Existing Playwright suite still 15/15 green | ✅ |

---

## Notification email allowlist (per your constraint)

Only these 5 events trigger an email fallback in addition to the in-app notification:

| Event | Recipients |
|---|---|
| `rfq.published` | RFQ owner + assigned suppliers |
| `rfq.supplier.selected` | Selected supplier + owner |
| `proforma.requested` | Selected supplier + owner |
| `po.issued` | Selected supplier + owner |
| `password.reset` (via `forgotPassword`) | Account holder |

Every other in-app notification stays socket-only. Mail noise stays low.

---

## Verification (smoke)

```
✓ POST /api/auth/forgot-password           → 200; console mailer logs subject
                                              "Reset your DeMaxtore password"
                                              + plain-text body with /reset-password?token=… URL
✓ FSM transition rfq.published              → 2 fallback emails rendered
                                              (buyer OWNER + supplier COUNTERPARTY)
✓ Provider init telemetry                   → "✓ Proforma SLA worker started intervalMs:900000"
✓ Playwright suite                          → 15/15 green (47s)
```

End-to-end check from `/var/log/supervisor/dmx-backend.out.log`:

```
📧 Password-reset link issued
📧 [console] email rendered (no provider configured)
   to: "buyer@dema.test"
   subject: "Reset your DeMaxtore password"
   length: 1997
----- BEGIN EMAIL -----
Hello Dema Buyer,

Reset your DeMaxtore password using this link (expires in 1 hour):
http://localhost:3000/reset-password?token=…

If you didn't request this, ignore this email.
-----  END EMAIL  -----
```

---

## File map (Sprint 2.9 — created / modified)

```
apps/backend/
├── .env                                      ✎ + EMAIL_PROVIDER (console default)
│                                               + EMAIL_FROM, EMAIL_REPLY_TO, APP_BASE_URL,
│                                               + SLA_WORKER_INTERVAL_MS, commented-out
│                                               + RESEND_API_KEY/SMTP_* slots
├── prisma/
│   ├── schema.prisma                         ✎ Workspace.lastSlaReminderAt
│   └── migrations/2026..._add_last_sla.../   + new Prisma migration
├── src/
│   ├── config/env.ts                         ✎ + 10 new zod-validated env vars
│   ├── server.ts                             ✎ startSlaWorker() on boot
│   ├── modules/auth/auth.service.ts          ✎ forgotPassword() now mailer.sendAsync()
│   └── modules/messaging/                    + new module
│       ├── provider.ts                         · EmailProvider iface +
│       │                                         console/resend/smtp impls + cached factory
│       ├── templates.ts                        · 3 inline-CSS templates
│       ├── mailer.ts                           · send() + sendAsync() (fire-and-forget)
│       └── sla-worker.ts                       · cron tick + idempotency via DB column
└── (rfq.service.ts applyTransition)          ✎ post-commit notification email fallback
                                                (allowlist of 4 FSM events)

docs/email-dns-setup.md                       + new — DNS/SPF/DKIM/Return-Path checklist
docs/sprint-2.9-messaging-delivery-report.md  + this report

package.json (backend)                        ✎ + resend@^4 + nodemailer@^6 (+ @types/nodemailer)
```

`tsc --noEmit` (backend): **0 errors**.
Contracts vitest: **22/22**.
Playwright e2e: **15/15**.

---

## Production cutover — single env flip

When you're ready to send real email:

1. Create Resend account, add API key.
2. Verify `mail.demaxtore.com` (4 DNS records — see `docs/email-dns-setup.md`).
3. Edit `apps/backend/.env`:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
   ```
4. `sudo supervisorctl restart dmx-backend`.

No code changes. The same `mailer.send()` calls now reach Gmail/Outlook/Yandex.

---

## What's deliberately NOT in this sprint

- ❌ Marketing email
- ❌ Newsletter
- ❌ Bulk buyer outreach
- ❌ Producer campaign emails
- ❌ Template builder (no MJML, no Handlebars, no React-Email — vanilla HTML only)
- ❌ Webhook receipts / bounce dashboards
- ❌ Email queue / retry exponential backoff (best-effort + WARN log is sufficient at this scale)

If/when volume grows or compliance asks for delivery receipts, a future sprint
can plug a queue + a worker process behind the same `EmailProvider` interface.

---

## Roadmap status

1. ~~Supplier Quotation UI Form~~ ✅
2. ~~Messaging & Delivery Sprint~~ ✅
3. **Sprint 3 — CommodityBid Runtime** ← next, when you green-light it.
