# WhatsApp Cloud API — Production Certification

**Certification status:** **WHATSAPP CLOUD API — PRODUCTION CERTIFIED**

**Certification date:** 17 July 2026  
**Production URL:** https://workspace.demaxtore.com  
**Meta App ID:** `2070730986853572` (DeMaxtore)  
**WABA ID:** `1745589496717695`  
**Phone Number ID:** `1221373704390497`  
**Production number:** `+90 551 865 94 42`  
**Test prefix:** `WA-LIVE-CERT-20260717`

## Verified production flow

```
Real WhatsApp handset
  → Meta Cloud API
  → POST /api/webhooks/whatsapp
  → signature validation (X-Hub-Signature-256 / App Secret)
  → deduplication (metaMessageId unique)
  → whatsapp_messages persistence
  → Workspace WhatsApp Inbox
  → outbound reply
  → sent / delivered / read webhook updates
```

## Verified results (17 July 2026)

| Check | Result |
|-------|--------|
| Inbound webhook HTTP 200 | **PASS** |
| Database persistence | **PASS** |
| Workspace Inbox visibility | **PASS** |
| Outbound reply | **PASS** |
| sent status | **PASS** |
| delivered status | **PASS** |
| read status | **PASS** |
| Duplicate prevention | **PASS** |
| PM2 stability | **PASS** |
| `/api/healthz` | **200** |
| `/api/ready` | **200** |
| Production pilot | **PASS** |
| Remaining blocker | **NONE** |

### Live pilot evidence (redacted)

| Scenario | Result | Notes |
|----------|--------|-------|
| Meta inbound webhook | **PASS** | `facebookexternalua` POST → **200** in nginx access log |
| Inbound persistence | **PASS** | Inbound row in `whatsapp_messages` with `meta_message_id` and contact record |
| Workspace Inbox | **PASS** | Inbound thread visible at `/admin/whatsapp-inbox` |
| Outbound reply | **PASS** | Reply sent from Inbox UI; delivered to real handset |
| Status webhooks | **PASS** | `sent_at`, `delivered_at`, `read_at` populated on outbound row |
| Duplicate replay | **PASS** | Identical signed webhook payload replayed twice → HTTP 200 both times; single row retained |
| GET verification | **PASS** | Hub challenge → 200 + challenge body |
| Graph API (WABA / phone) | **PASS** | WABA and Phone Number ID accessible with System User token |

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
| Valid Meta signature | 200 | **PASS** |
| Missing signature | 401 | **PASS** — `WHATSAPP_SIGNATURE_MISSING` |
| Invalid signature | 403 | **PASS** — `WHATSAPP_SIGNATURE_INVALID` |
| Workspace JWT absent (valid Meta sig) | 200 | **PASS** |
| Public inbox listing | 401 | **PASS** |
| Non-admin inbox | 403 | **PASS** |

## Automated tests

| Suite | Passed | Failed |
|-------|-------:|-------:|
| WhatsApp service + webhook routes + inbox | 26 | 0 |

## Production

| Item | Value |
|------|-------|
| Health | `/api/healthz` → 200 |
| Readiness | `/api/ready` → 200 |
| PM2 | `demaxtore-backend` online (stable after clean restart) |

## Environment (redacted)

```
WHATSAPP_APP_SECRET=[SET — validated via appsecret_proof]
WHATSAPP_VERIFY_TOKEN=[SET]
WHATSAPP_ACCESS_TOKEN=[SET — System User token]
WHATSAPP_PHONE_NUMBER_ID=[SET — 1221373704390497]
WHATSAPP_BUSINESS_ACCOUNT_ID=[SET — 1745589496717695]
```

Do not commit or paste access tokens, App Secret values, or webhook verify tokens.

## Operational note — PM2 restart script

The existing safe restart script (`scripts/pm2-safe-backend-restart.sh`) previously caused an orphaned process and `EADDRINUSE` on port **3001** during reload. The production pilot passed after fully stopping the PM2 process, clearing port 3001, and starting one clean PM2-managed backend process.

**Follow-up:** fix the safe restart script separately so reload does not leave orphan listeners on port 3001.

## Prior blocker (resolved 17 July 2026)

Earlier certification (16 July 2026) failed because `WHATSAPP_APP_SECRET` in production was a locally generated 64-hex value, not the Meta Developer Console App Secret for app `2070730986853572`. Meta `facebookexternalua` POSTs returned **401/403** until the correct App Secret was configured and the backend was restarted with boot log confirmation:

`✓ WhatsApp App Secret validated against Meta (appsecret_proof)`

## Final status

**WHATSAPP CLOUD API — PRODUCTION CERTIFIED**

**Remaining blocker:** none.
