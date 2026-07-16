# WhatsApp Live Certification — ATT Webhook 401

**Date:** 2026-07-16  
**Production URL:** https://workspace.demaxtore.com  
**Meta App ID:** `2070730986853572` (DeMaxtore)  
**Test prefix:** `WA-LIVE-CERT-20260716`  
**Branch:** `snapshot/pre-pilot-20260714`  
**Production commit:** `bccc0b5`

## Root cause

| Item | Finding |
|------|---------|
| **401 source** | `validateWebhookSignature()` in `whatsapp.service.ts`, called from `whatsapp.webhook.routes.ts` POST handler |
| **JWT involved?** | **No** — `/api/webhooks/whatsapp` is mounted in `app.ts` **before** `express.json()` and **before** `/api` JWT routes |
| **Raw body** | **Correct** — `express.raw({ type: "application/json" })` on webhook path; signature computed over `req.body` Buffer |
| **Why Meta fails** | `WHATSAPP_APP_SECRET` in production `.env` is a **locally generated 64-hex value** (`openssl rand -hex 32` pattern), **not** the Meta Developer Console App Secret for app `2070730986853572` |
| **Proof** | `isWhatsAppAppSecretValidForAccessToken()` → **false** (Graph API `appsecret_proof` rejects). Requests signed with the current `.env` secret return **200**; Meta `facebookexternalua` POSTs return **401/403** |

### Action required (ops)

1. Open [Meta Developer Console](https://developers.facebook.com/apps/2070730986853572/settings/basic/)
2. **App Settings → Basic → App Secret → Show**
3. Set `WHATSAPP_APP_SECRET` in `apps/backend/.env` to that value (typically ~32 characters; **not** the access token, **not** `generate-secret.sh` output)
4. `bash scripts/pm2-safe-backend-restart.sh` (loads `--update-env`)
5. Confirm boot log: `✓ WhatsApp App Secret validated against Meta (appsecret_proof)`
6. Send test WhatsApp message from handset → expect `POST /api/webhooks/whatsapp` **200** in nginx access log

## Implementation

| Area | Status |
|------|--------|
| Route auth order | Public webhook before JWT; inbox APIs require `requireAuth` + admin roles |
| Raw body | `express.raw` on webhook mount |
| Signature validation | HMAC-SHA256, `timingSafeEqual`, structured reason codes |
| Startup check | `isWhatsAppAppSecretValidForAccessToken()` on boot |
| Inbox module | `whatsapp-inbox` — ingest, idempotency via `metaMessageId` unique, status updates |
| Error handler | `headersSent` guard in `error.ts` |

## Security matrix

| Scenario | Expected | Result |
|----------|----------|--------|
| Valid Meta signature | 200 | **BLOCKED** — wrong App Secret until ops update |
| Missing signature | 401 | **PASS** — `WHATSAPP_SIGNATURE_MISSING` |
| Invalid signature | 403 | **PASS** — `WHATSAPP_SIGNATURE_INVALID` |
| Workspace JWT absent (valid Meta sig) | 200 | **PASS** (when secret correct) |
| Public inbox listing | 401 | **PASS** |
| Non-admin inbox | 403 | **PASS** |

## Live test

| Scenario | Result | Evidence |
|----------|--------|----------|
| GET verification | **PASS** | `hub.verify_token=demaxtore_whatsapp_2026` → 200 + challenge |
| New access token Graph API | **PASS** | Phone `+90 551 865 94 42`, verified name DeMaxtore |
| Outbound Graph API | **PASS** | `WA-LIVE-CERT-20260716 OUTBOUND 001` → Meta message ID returned |
| Meta inbound webhook | **BLOCKED** | `facebookexternalua` → 401 until App Secret fixed |
| Inbox persistence (simulated signed POST) | **PASS** | Prior cert: message in `WhatsAppContact` / `WhatsAppMessage` |
| Real handset inbound | **PENDING** | Requires correct `WHATSAPP_APP_SECRET` |
| Real handset reply | **PENDING** | Outbound API ready; inbound thread needed |

## Automated tests

| Suite | Passed | Failed |
|-------|-------:|-------:|
| WhatsApp service + webhook routes + inbox | 26 | 0 |

## Production

| Item | Value |
|------|-------|
| Commit | `bccc0b5` |
| Health | `/api/healthz` → 200 |
| Readiness | `/api/ready` → 200 |
| PM2 | `demaxtore-backend` online |
| Rollback | `git checkout 91aa3f3` + rebuild + `pm2-safe-backend-restart.sh` |

## Environment (redacted)

```
WHATSAPP_APP_SECRET=[SET — INVALID for Meta; must replace from Developer Console]
WHATSAPP_VERIFY_TOKEN=[SET]
WHATSAPP_ACCESS_TOKEN=[SET — updated 2026-07-16]
WHATSAPP_PHONE_NUMBER_ID=[SET — 1221373704390497]
WHATSAPP_BUSINESS_ACCOUNT_ID=[SET — 1745589496717695]
META_APP_SECRET=[MISSING]
```

## Final status

**WHATSAPP NOT CERTIFIED**

**Blocker:** `WHATSAPP_APP_SECRET` must be the Meta Developer Console App Secret for app `2070730986853572`. The access token you provided is correct for send/receive API calls but is **not** used for webhook signature verification.
