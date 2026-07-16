# WhatsApp Controlled Pilot Runbook

**Status:** NOT PRODUCTION-CERTIFIED until all steps below are executed and signed off.  
**Configured endpoint:** `https://workspace.demaxtore.com/api/webhooks/whatsapp`  
**Mode observed:** `live` (credentials present; delivery not verified in remediation session)

---

## 1. Required Meta configuration

- [ ] Meta Business account with WhatsApp Business Platform access  
- [ ] `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` set in backend `.env` (never commit)  
- [ ] **`WHATSAPP_APP_SECRET` must be the Meta Developer Console App Secret** (App Settings → Basic → Show). Do **not** use `scripts/generate-secret.sh` output — that causes webhook POST 401 from Meta.
- [ ] Webhook URL: `https://workspace.demaxtore.com/api/webhooks/whatsapp`  
- [ ] Webhook verify token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`  
- [ ] Subscribed fields: `messages`, `message_status` (and templates if using outbound templates)  
- [ ] Opt-in / template compliance documented for pilot recipients  

---

## 2. Test sender

Record (redact secrets in copies):

| Field | Value |
|-------|-------|
| Business display number | _ops to fill_ |
| Phone number ID | _from env_ |
| Pilot operator | _name / role_ |

---

## 3. Test recipient

| Field | Value |
|-------|-------|
| E.164 mobile | _pilot buyer/supplier test phone_ |
| Opt-in confirmed | Yes / No |
| Workspace user linked | _email / user id_ |

---

## 4. Outbound test

1. From Workspace, open `/buyer/messages` or relevant thread.  
2. Send a plain-text message to the test recipient via WhatsApp integration.  
3. **Pass:** Meta API returns message id; message appears in provider dashboard.  
4. **Fail:** Log error from `whatsapp.service.ts`; do not enable customer-facing WA badge.

---

## 5. Inbound test

1. From test recipient phone, send message to business number.  
2. **Pass:** Webhook received (200); row in chat/message tables; thread visible in Workspace.  
3. Verify `ProcessedEvent` idempotency row created.

---

## 6. Reply test

1. Reply from Workspace UI to inbound thread.  
2. **Pass:** Recipient receives reply within SLA (< 30s).  

---

## 7. Media test

1. Send inbound image or document (< 25MB, allowed MIME).  
2. **Pass:** Media stored; download authorized for thread participants only.  

---

## 8. Delivery status test

1. Observe `delivered` / `read` webhook statuses.  
2. **Pass:** Status persisted on message row; no duplicate processing.  

---

## 9. Duplicate webhook test

1. Replay identical webhook payload with same `wamid`.  
2. **Pass:** Second delivery ignored (idempotent); no duplicate messages.  

---

## 10. Token-expiry test

1. Simulate expired access token (or wait for natural expiry).  
2. **Pass:** Error logged; `whatsapp_bridge_retry` worker retries; ops alerted.  

---

## 11. Failure and retry test

1. Force outbound failure (invalid recipient or revoked permission).  
2. **Pass:** Failure state logged; retry policy documented; no silent success in UI.  

---

## 12. Thread association verification

- [ ] Inbound message attaches to correct RFQ/order/workspace thread  
- [ ] Cross-tenant phone numbers cannot read other tenants' threads  

---

## 13. Database verification

```sql
-- Replace :thread_id after pilot
SELECT id, direction, status, external_id, created_at
FROM "ChatMessage"
WHERE "conversationId" = :thread_id
ORDER BY created_at DESC
LIMIT 20;
```

---

## 14. Rollback procedure

1. Set `WHATSAPP_MODE=demo` or remove credentials (stops live sends).  
2. Hide WhatsApp entry points in UI copy if pilot fails.  
3. `pm2 restart demaxtore-backend` after env change.  
4. Document incident in ops log.

---

## 15. Go / no-go criteria

| Criterion | Required |
|-----------|----------|
| Outbound deliver | **Go** |
| Inbound + reply round-trip | **Go** |
| Signature validation on unsigned webhook → 401/403 | **Go** |
| Tenant isolation spot-check | **Go** |
| Duplicate webhook idempotent | **Go** |
| Any P0 messaging regression | **No-go** |

**Sign-off roles:** Engineering lead, Ops lead, Customer success (pilot owner)

---

Until sign-off: documentation and UI must state **WhatsApp is in pilot — not certified for production customer operations.**
