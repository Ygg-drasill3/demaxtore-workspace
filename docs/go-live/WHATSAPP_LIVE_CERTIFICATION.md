# WhatsApp Live Certification — ATT Webhook 401

**Date:** 2026-07-16  
**Production URL:** https://workspace.demaxtore.com  
**Branch:** `snapshot/pre-pilot-20260714`  
**Production commit:** `69ce7c3`  
**Previous commit:** `91aa3f3`  
**Meta App ID:** `2070730986853572` (DeMaxtore)  
**Test prefix:** `WA-LIVE-CERT-20260716`

## Root cause

`POST /api/webhooks/whatsapp` returns **401/403** because `verifyWebhookSignature()` in `whatsapp.webhook.routes.ts` rejects Meta requests when `WHATSAPP_APP_SECRET` does **not** match the Meta Developer Console App Secret.

| Finding | Detail |
|---------|--------|
| Rejecting function | `validateWebhookSignature()` → `whatsapp.webhook.routes.ts` POST handler |
| JWT involved? | **No** — webhook mounted in `app.ts` before `/api` router and `requireAuth` |
| Raw body | **Correct** — `express.raw({ type: "application/json" })` on `/api/webhooks/whatsapp` |
| Env mismatch | `WHATSAPP_APP_SECRET` is a 64-char hex value (same pattern as `generate-secret.sh` / payment webhooks), **not** the Meta App Secret |
| Startup proof | `isWhatsAppAppSecretValidForAccessToken()` fails `appsecret_proof` against Graph API |
| Meta User-Agent | `facebookexternalua` reaches Nginx → backend; signature validation fails |

## Implementation (commit `69ce7c3`)

- Structured signature errors: `WHATSAPP_SIGNATURE_MISSING`, `WHATSAPP_SIGNATURE_MALFORMED`, `WHATSAPP_SIGNATURE_INVALID`, `WHATSAPP_RAW_BODY_MISSING`
- `crypto.timingSafeEqual` on hex digests; 403 for invalid signature, 401 for missing/malformed
- Boot-time `appsecret_proof` validation with explicit error log
- WhatsApp Inbox module (Prisma, API, UI, socket events, idempotency via `metaMessageId` unique)
- `errorHandler` guard when `res.headersSent`
- Regression tests: webhook routes, signature unit tests, inbox parser/send tests

## Environment (redacted)

| Variable | Status |
|----------|--------|
| `WHATSAPP_APP_SECRET` | SET — **INVALID** (does not match Meta app `2070730986853572`) |
| `WHATSAPP_VERIFY_TOKEN` | SET |
| `WHATSAPP_ACCESS_TOKEN` | SET (updated 2026-07-16) |
| `WHATSAPP_PHONE_NUMBER_ID` | SET (`1221373704390497`) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | SET (`1745589496717695`) |
| `META_APP_SECRET` | MISSING (not used; app uses `WHATSAPP_APP_SECRET`) |

**Required fix:** Set `WHATSAPP_APP_SECRET` to the value from Meta Developer Console → App **2070730986853572** → Settings → Basic → **App Secret** → Show. This is **not** the access token (`EAA…`).

## Security matrix

| Scenario | Expected | Result |
|----------|----------|--------|
| Valid Meta signature | 200 | BLOCKED until App Secret fixed |
| Missing signature | 401 | PASS |
| Invalid signature | 403 | PASS |
| Workspace JWT absent + valid Meta sig | 200 | BLOCKED until App Secret fixed |
| Public Inbox listing | 401 | PASS (requires auth) |
| Non-admin Inbox access | 403 | PASS (role-gated) |

## Live test

| Scenario | Result | Evidence |
|----------|--------|----------|
| GET webhook verification | PASS | 200 + challenge with correct verify token |
| Meta POST (facebookexternalua) | **FAIL** | Nginx 401 — wrong App Secret |
| Locally signed POST | PASS | 200 with current (wrong) secret only |
| Outbound API (new token) | PARTIAL | Graph API 200 for phone metadata; send to API number returns 400 |
| Inbound handset → Workspace | **BLOCKED** | Requires correct App Secret |
| Workspace → handset | **BLOCKED** | Needs valid test recipient E.164 |
| sent/delivered/read status | **BLOCKED** | Depends on inbound/outbound |
| Duplicate webhook | PASS (unit) | `metaMessageId` unique constraint |
| Refresh persistence | PASS (unit/API) | Inbox DB models deployed |

## Automated tests

| Suite | Passed | Failed |
|-------|-------:|-------:|
| WhatsApp module (focused) | 26 | 0 |

## Production

| Item | Value |
|------|-------|
| Commit | `69ce7c3` |
| Build | `2026-07-16T14:51:33.308Z` |
| `/api/healthz` | 200 |
| `/api/ready` | 200 |
| PM2 | `demaxtore-backend` online |
| Rollback | `git revert 69ce7c3` + rebuild + `pm2-safe-backend-restart.sh` |

## Final status

**WHATSAPP NOT CERTIFIED**

**Blocker:** `WHATSAPP_APP_SECRET` must be set to the Meta Developer Console App Secret for app `2070730986853572`, then PM2 restart with `--update-env`, then repeat live handset inbound/outbound tests.
