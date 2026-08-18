# DeMaxtore — Email DNS Setup Checklist

This is the 1-page admin checklist to take operational email **from `EMAIL_PROVIDER=console` to production Resend delivery** without code changes.

---

## TL;DR

| Action | Where | Owner |
|---|---|---|
| Create Resend account + API key | https://resend.com/api-keys | Platform admin |
| Verify sending domain `mail.demaxtore.com` | Resend → Domains → Add | Platform admin |
| Add 4 DNS records (below) | DNS provider for `demaxtore.com` | Platform admin |
| Set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` in backend `.env` | Supervisor backend host | Platform admin |
| `sudo supervisorctl restart dmx-backend` | Supervisor host | Platform admin |
| Send a test password-reset email to your own address | DeMaxtore UI → `/forgot-password` | Verifier |

---

## Recommended sending architecture

```
Web:  https://demaxtore.com
Mail: no-reply@mail.demaxtore.com
Ops:  ops@mail.demaxtore.com  ← Reply-To inbox (real mailbox)
```

Reason: keep transactional email off the apex domain so a deliverability issue
on `mail.demaxtore.com` never poisons the marketing/site domain's reputation.

---

## DNS records (paste from Resend's Verify panel)

Resend shows you 4 records under **Domains → mail.demaxtore.com → Verify**.
Each row has an exact `Type / Host / Value` you copy verbatim.

| # | Type | Host | Value | Why |
|---|---|---|---|---|
| 1 | MX  | `send.mail.demaxtore.com`        | `feedback-smtp.resend.com` (priority 10) | Bounce/feedback handling |
| 2 | TXT | `send.mail.demaxtore.com`        | `v=spf1 include:amazonses.com ~all` | SPF — authorises Resend's SMTP origins |
| 3 | TXT | `resend._domainkey.mail.demaxtore.com` | (long DKIM public key Resend gives you) | DKIM — cryptographically signs every email |
| 4 | TXT | `_dmarc.mail.demaxtore.com`      | `v=DMARC1; p=none; rua=mailto:dmarc@mail.demaxtore.com` | DMARC — recommended for inbox placement |

**TTL**: leave at provider default (3600 is fine).
**Propagation**: usually 5–30 min, max 24 h. Re-click *Verify* in Resend until green.

---

## After domain is verified

1. In `/app/apps/backend/.env`:
   ```
   EMAIL_PROVIDER=resend
   EMAIL_FROM=DeMaxtore <no-reply@mail.demaxtore.com>
   EMAIL_REPLY_TO=ops@mail.demaxtore.com
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
2. `sudo supervisorctl restart dmx-backend`
3. Hit **Forgot password** in the UI; check the inbox.
4. Verify in Resend dashboard → Emails — the message should show `delivered`.

If something stays in `bounced` / `complained`, recheck DKIM/SPF (record #2 and #3).

---

## SMTP fallback (optional)

If Resend is unavailable in your jurisdiction, swap to any SMTP relay
(SES, Mailgun, Postmark, in-house Postfix). Set in `.env`:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=false      # true for 465
```

DKIM / SPF still required at DNS level — the records belong to the SMTP provider
of your choice, but the SPF/DKIM/DMARC mechanism is identical.

---

## What ships in `console` mode (current default)

- All emails rendered to backend logs (`/var/log/supervisor/dmx-backend.out.log`).
- Subject + plain-text body printed between `BEGIN EMAIL` and `END EMAIL` markers.
- HTML version cached in memory only.
- Safe for dev, staging, and preview environments; no network egress.

---

## Operational emails the platform sends today

| Trigger | Template | Recipients |
|---|---|---|
| `POST /api/auth/forgot-password` | `forgot-password` | The user (always 200, no enumeration) |
| FSM transition `rfq.published`        | `notification-fallback` | RFQ owner (BUYER) + all assigned suppliers |
| FSM transition `rfq.supplier.selected` | `notification-fallback` | Selected supplier + owner |
| FSM transition `proforma.requested`   | `notification-fallback` | Selected supplier + owner |
| FSM transition `po.issued`            | `notification-fallback` | Selected supplier + owner |
| Cron — every 15 min, `PROFORMA_REQUESTED` workspaces with deadline ≤ 24h | `proforma-sla-reminder` | Selected supplier |

Each send is **fire-and-forget**; provider failures never block an HTTP response.
Idempotency for the SLA reminder is enforced via `workspaces.last_sla_reminder_at`.
