# Production Secrets Report

**Date:** 2026-06-17  
**Environment:** Staging  
**Verdict:** **PASS**

---

## Actions taken

| Item | Status |
|------|--------|
| `scripts/generate-secret.sh` created | Done — `openssl rand -hex 32` (64 chars, 256-bit) |
| `--verify` minimum length (≥32) | Done |
| `PAYMENT_WEBHOOK_SECRET` in `apps/backend/.env` | **SET** (64 hex chars) |
| `CARRIER_WEBHOOK_SECRET` in `apps/backend/.env` | **SET** (64 hex chars) |
| `PAYMENT_WEBHOOK_ENFORCE_HMAC=true` | Set |
| `CARRIER_WEBHOOK_ENFORCE_HMAC=true` | Set |
| `.env.example` updated | Done — references `generate-secret.sh` |

---

## Generation procedure (production)

```bash
./scripts/generate-secret.sh              # print one secret
./scripts/generate-secret.sh --verify "$VAL"  # validate length
```

**Never commit** generated values to git. Copy into production `.env` via secure channel (vault, SSH, secrets manager).

---

## Entropy validation

| Secret | Min length | Algorithm |
|--------|------------|-----------|
| `PAYMENT_WEBHOOK_SECRET` | 64 hex (32 bytes) | `openssl rand -hex 32` |
| `CARRIER_WEBHOOK_SECRET` | 64 hex (32 bytes) | `openssl rand -hex 32` |

---

## Runbook references

- [`payment-gates-rollout-runbook.md`](../payment-gates-rollout-runbook.md) — `PAYMENT_WEBHOOK_SECRET` + HMAC
- [`carrier-automation-rollout-runbook.md`](../carrier-automation-rollout-runbook.md) — `CARRIER_WEBHOOK_SECRET`
- [`production-readiness-rollout-runbook.md`](../production-readiness-rollout-runbook.md)

---

## P0 re-validation

After secrets applied: `./scripts/production-p0-validate.sh` with `NODE_ENV=production` → **PASS** (2026-06-17).
