# Incident Response Runbook

**Updated:** 2026-07-16  
**Production API:** `https://workspace.demaxtore.com/api`  
**Backend process:** PM2 `demaxtore-backend`

---

## Severity levels

| Level | Examples | Response time |
|-------|----------|---------------|
| SEV-1 | API down, data loss, payment mis-routing, tenant data leak | 15 min |
| SEV-2 | Degraded auth, messaging outage, FSM blocked for all users | 1 h |
| SEV-3 | Single module failure, UI bug with workaround | Next business day |

---

## First 15 minutes

1. **Confirm impact** — `curl -sS https://workspace.demaxtore.com/api/healthz/ready`  
2. **Check PM2** — `pm2 status demaxtore-backend`  
3. **Tail errors** — `tail -100 /var/log/demaxtore/backend-error.log`  
4. **Assign incident commander** — engineering on-call  
5. **Customer comms** — CS lead if SEV-1/2  

---

## Common scenarios

### Backend restart loop

**Symptoms:** PM2 restart count increasing rapidly  
**Checks:** CFG-001 flags missing (`production-safety.ts` exit); DB connection; port 3001 conflict  
**Mitigation:** Set safety flags in `.env`; fix DB; `pm2 logs demaxtore-backend --lines 200`  
**Deploy note (2026-07-16):** `pm2 reload` can leave orphan listener on :3001 → use `pm2 stop demaxtore-backend && fuser -k 3001/tcp && pm2 start ecosystem.config.cjs`  
**Do not:** `pm2 reset` counters without fixing root cause  

### Legacy `demaxtore` process errored

**Symptoms:** PM2 shows `demaxtore` errored, `EADDRINUSE :3010`  
**Cause:** Obsolete app conflicts with `demaxtore-website`  
**Fix:** `pm2 delete demaxtore && pm2 save`  

### Online payments accidentally enabled with stub

**Symptoms:** Checkout URLs with `pi_stub_`  
**Fix:** Ensure `ONLINE_PAYMENTS_ENABLED` not set with stub; redeploy payment factory; verify `GET /api/payments/capabilities`  

### WhatsApp webhook failures

**Checks:** Meta dashboard delivery logs; `WHATSAPP_APP_SECRET`; signature headers  
**Mitigation:** Set demo mode; see `docs/WHATSAPP_PILOT_RUNBOOK.md` rollback  

---

## Controlled restart procedure

```bash
# 1. Verify readiness prerequisites
grep -E 'PAYMENT_GATES|INCOTERMS_PRECONDITIONS|EXCEPTION_ENGINE|RBAC_EXPANDED' apps/backend/.env

# 2. Build and restart
cd /var/www/demaxtore/DemaxtoreSolitions-main
yarn workspace @dmx/backend build
pm2 restart demaxtore-backend

# 3. Verify
curl -sS https://workspace.demaxtore.com/api/healthz/ready | jq '.ready,.safetyGates'
```

---

## Rollback

```bash
git checkout <previous-release-sha>
yarn workspace @dmx/backend build
pm2 restart demaxtore-backend
```

---

## Post-incident

- [ ] Timeline documented  
- [ ] Tracker updated (`docs/ENTERPRISE_REMEDIATION_TRACKER.md`)  
- [ ] Regression test added if gap found  
- [ ] Customer notification if data touched  

---

## Contacts (fill before go-live)

| Role | Contact |
|------|---------|
| Engineering on-call | _TBD_ |
| DBA / infrastructure | _TBD_ |
| Customer success | _TBD_ |
| Security | _TBD_ |
