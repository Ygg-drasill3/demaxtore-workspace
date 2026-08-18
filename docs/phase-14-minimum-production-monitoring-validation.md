# PHASE 14 — MINIMUM PRODUCTION MONITORING VALIDATION

**Report date:** 17 August 2026  
**Type:** Release validation / production operability / alerting  
**Environment:** Production — `https://workspace.demaxtore.com`  
**Backend:** `demaxtore-workspace-backend.service` (systemd, port 3001)  
**Commit:** `c9e4328d8fd0aef5ce743013bf378e6e35add538`  
**Constraints honored:** No production dependency destruction · No R4/Customer #1 mutation · No monitoring product build · No code changes

---

## 1. Executive Summary

Phase 14 validated whether DeMaxtore can **operate** Customer #1 safely — not merely execute transactions.

**Bottom line:** Production has **credible dependency detection** (`/api/ready`), **verified automated backups** (real 02:00 unattended run post-Phase 15A), **systemd auto-restart**, and **Ops transaction visibility** (Control Tower). However, **automatic human alert delivery is NOT PRESENT**. Outage and backup failure detection currently depend on **documented manual pilot controls**.

| Area | Result |
|---|---|
| Dependency readiness (`/api/ready`) | **PASS** — DB, Redis, storage, socket, safety gates probed |
| Readiness false-green risk | **NO** — Redis probed whenever `REDIS_URL` set |
| Backup freshness detection | **PASS** — measurable, FRESH at validation time |
| Backup failure detection | **PASS** — failure markers + syslog |
| Real unattended post-15A backup | **PASS** — `20260817-020001` at 02:00 UTC |
| Restore capability | **PASS** — spot-check from today's backup |
| Systemd auto-recovery | **PASS** — controlled restart recovered in <2s |
| Automatic alert delivery | **NOT PRESENT** |
| External availability probe | **NOT PRESENT** |
| Daily manual pilot check | **DEFINED** — `docs/pilot-operations/monitoring-runbook.md` |

**Verdict:** **PASS WITH MANUAL PILOT CONTROLS / ACCEPTED RISKS**

**P0 Open:** 0  
**New P1 Open:** 3 (alerting gaps — compensating manual runbook created)  
**Carry-forward P1:** 2 (off-host backup, supplier branding IDOR)

---

## 2. Environment

| Item | Value |
|---|---|
| Host | Production pilot server (`srv1661754`) |
| API | `https://workspace.demaxtore.com/api` |
| Node backend log | `/var/log/demaxtore-node-backend.log` (48M at validation) |
| Backup log | `/var/log/demaxtore-backup.log` |
| Backup root | `/var/www/demaxtore/DemaxtoreSolitions-main/.data/backups` |
| Uploads | `/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend/.data/uploads` |
| Redis | `redis://127.0.0.1:6379` (configured) |
| Storage provider | `local` |
| Email provider | `resend` (config present) |
| Socket adapter | `memory` (`SOCKET_ADAPTER` unset; single-instance) |

**Health before validation:** `healthz=ok`, `ready=true`  
**Health after validation:** `healthz=ok`, `ready=true` (including controlled service restart)  
**Unexpected 5xx during validation:** 0

---

## 3. Current Monitoring Architecture

```
SIGNAL                    DETECTION                    FREQUENCY        ALERT DEST        OPERATOR ACTION           TEST
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Process alive             GET /api/healthz             On-demand        NONE              Manual curl               PASS
Dependencies healthy      GET /api/ready               On-demand        NONE              Manual curl               PASS
Process crash             systemd Restart=always       Continuous       journal + file    systemctl status          PASS
Backup success/fail       backup-production.sh         Daily 02:00      syslog + file     backup-status.sh          PASS
Backup stale >26h         backup-status.sh (text)      On-demand        NONE              Read STALE line           PASS*
Backup restore valid      backup-restore-spot-check    On-demand        NONE              Run spot-check            PASS
Disk usage                df / du                      On-demand        NONE              Manual df                 MANUAL
HTTP 5xx accumulation     App log file                 Continuous       NONE              grep/tail log             MANUAL
Transaction attention     Control Tower UI/API         On-demand        NONE              Ops dashboard review      PASS
External outage           —                            —                NOT PRESENT       —                         FAIL†

† Endpoint exists but no independent probe calls it.
* STALE detected in output but script exits 0 (see P1-14-003).
```

**Self-monitoring problem:** The production backend checks its own dependencies via `/api/ready`. If the Node process is dead, readiness is unreachable — **no independent external monitor** currently compensates. Ops must use manual checks or notice user-reported outage.

---

## 4. Healthz Semantics

**Endpoint:** `GET /api/healthz` (also `GET /api/healthz/` via health router mount)

**Implementation:** `apps/backend/src/modules/health/health.routes.ts` — liveness only

| Aspect | Value |
|---|---|
| HTTP status (healthy) | 200 |
| Proves | Node process responding, uptime, build metadata |
| Does NOT check | PostgreSQL, Redis, storage, email, sockets |
| Dependencies checked | **None** |
| Sample response | `{"status":"ok","uptimeSec":242043,"commitSha":"c9e4328...","branch":"snapshot/pre-pilot-20260714",...}` |

**Test status:** PASS — returns 200 before and after validation

---

## 5. Readiness Semantics

**Endpoint:** `GET /api/ready`

| Check | Semantics | Blocks `ready`? | Production value |
|---|---|---|---|
| `db` | `prisma.$queryRaw\`SELECT 1\`` | Yes if `down` | `up` |
| `redis` | `getRedisClient().ping()` when `REDIS_URL` set | Yes if `down` | `up` |
| `storage` | Local: `provider.getPath("")` (dir R/W); S3: `S3_BUCKET` configured | Yes if `down` | `up` |
| `email` | Config presence only (Resend key / SMTP host) — **not** send test | No (`degraded` allowed) | `up` |
| `socketAdapter` | Memory adapter → `up`; Redis adapter → requires `redisConnected` | Yes if `down` | `up` (memory) |
| `safetyGates` | All 4 production gates must be enabled | Yes if `down` | `up` |

**HTTP status:** 200 when `ready:true`; 503 when blocking checks fail or safety gates unsatisfied.

**False-green assessment:** **NO** for mandatory dependencies — Redis is probed independently of socket adapter (hardening comment at `health.routes.ts:41-43` confirmed in live code).

**Test status:** PASS

---

## 6. PostgreSQL Monitoring

| Field | Value |
|---|---|
| Signal | DB connectivity |
| Detection | `/api/ready` → `checks.db` via `SELECT 1` |
| Frequency | On each `/ready` call |
| Alert destination | NOT PRESENT (manual) |
| Operator action | Check `postgresql.service`, `DATABASE_URL`, disk |
| Failure effect | All authenticated API operations fail; readiness 503 |
| Destructive prod test | Not performed |
| Test status | PASS (live `up`) |

---

## 7. Redis Monitoring

| Field | Value |
|---|---|
| Signal | Redis reachability |
| Detection | `/api/ready` → `checks.redis` via PING |
| Code regression | Fixed blind spot — Redis probed whenever `REDIS_URL` set, not only for socket adapter |
| Failure operational effect | Rate limiters fail closed → `503 RATE_LIMIT_UNAVAILABLE` on login/credential endpoints; readiness `redis: down` |
| Alert destination | NOT PRESENT |
| Destructive prod test | Not performed (Redis kept available) |
| Test status | PASS (live `up`; code audit confirms failure would mark `down`) |

---

## 8. Storage Monitoring

| Field | Value |
|---|---|
| Signal | Upload storage availability |
| Detection | `/api/ready` → `checks.storage` |
| Local semantics | Resolves `STORAGE_DIR`, verifies directory exists and is readable/writable via `getPath("")` |
| Production path | `/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend/.data/uploads` |
| Failure effect | Uploads/documents/POD writes fail; readiness `storage: down` |
| Alert destination | NOT PRESENT |
| Test status | PASS (live `up`) |

---

## 9. Email / Socket / Safety Gates

### Email (`email: up`)

**Proves:** Configuration exists — NOT actual send capability.

- `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` present → `up`
- Missing key with resend → `degraded` (does **not** block readiness)

No test email sent (no designated monitoring destination in infrastructure).

### Socket adapter (`socketAdapter: up`)

- `SOCKET_ADAPTER` unset → in-memory adapter → always `up`
- Pilot runs single instance; realtime degradation is non-blocking for Turkey Golden Path
- If `SOCKET_ADAPTER=redis` without connection → would report `down` and block readiness

### Safety gates (`safetyGates: up`)

Mandatory in production (all must be `true`):
- `PAYMENT_GATES_ENABLED`
- `INCOTERMS_PRECONDITIONS_ENABLED`
- `EXCEPTION_ENGINE_V2_ENABLED`
- `RBAC_EXPANDED_ROLES_ENABLED`

Disabled gate → `ready:false` + 503.

---

## 10. Systemd / Process Recovery

**Unit:** `/etc/systemd/system/demaxtore-workspace-backend.service`

| Setting | Value |
|---|---|
| ExecStart | `/usr/bin/node dist/server.js` |
| WorkingDirectory | `/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend` |
| EnvironmentFile | `apps/backend/.env` (secrets not documented) |
| User | `root` |
| After | `network.target postgresql.service` |
| Restart | `always` |
| RestartSec | `5` |
| Logs | `StandardOutput/Error=append:/var/log/demaxtore-node-backend.log` |

### Controlled restart test (Phase 14)

| Step | Result |
|---|---|
| `systemctl restart demaxtore-workspace-backend.service` | Executed |
| Time to `healthz=200` + `ready=200` | < 2 seconds |
| Login after restart | HTTP 200 |
| `NRestarts` before test | 0 |
| `Result` after restart | `success`, `active` |

**Restart loop detection:** systemd journal + log file would show rapid restarts, but **no automatic human alert**. Ops would notice via failed `/api/ready` during daily check or user report.

**Test status:** PASS (auto-recovery)

---

## 11. External Availability Monitoring

| Mechanism searched | Result |
|---|---|
| Root crontab health probe | **NOT FOUND** |
| systemd timer for health | **NOT FOUND** |
| External uptime service | **NOT PRESENT** (no evidence on host) |
| nginx health pass-through | Proxies to `127.0.0.1:3001` only — not an independent monitor |

**Conclusion:** `/api/ready` exists but is **not called by any independent scheduled process**. Outage detection requires manual probe or customer/Ops observation.

**Test status:** FAIL for automatic external monitoring; **MANUAL** compensating control documented.

---

## 12. Human Alert Delivery

| Alert type | Automatic delivery | Evidence |
|---|---|---|
| API outage | **NOT PRESENT** | No email/Slack/WhatsApp/webhook integration found |
| Backup failure | **NOT PRESENT** | Syslog + log file only — no consumer sends to human |
| Backup stale | **NOT PRESENT** | `backup-status.sh` prints STALE — no notification |
| Disk full | **NOT PRESENT** | No threshold alert |
| 5xx spike | **NOT PRESENT** | Log file only |
| systemd crash loop | **NOT PRESENT** | journalctl only |

**Syslog alone does NOT count as alerting** per Phase 14 policy.

**Test status:** Automatic alert delivery = **NOT PRESENT**

---

## 13. Backup Monitoring

| Capability | Status |
|---|---|
| Daily schedule | `0 2 * * * /bin/bash .../scripts/backup-production.sh` |
| Shell | `/bin/bash` (Phase 15A fix verified) |
| Absolute script path | Yes |
| Success marker | `.backup-complete` + `latest-success.json` |
| Failure marker | `.backup-failed` + `latest-failure.json` |
| Syslog tag | `demaxtore-backup` via `logger` |
| Retention | 14 days |
| Off-host | `not_configured` |

---

## 14. Backup Stale Detection

**Tool:** `scripts/backup-status.sh`  
**Threshold:** 26 hours (`STALE_THRESHOLD_HOURS`)

**Live production (17 Aug 2026 ~07:25 UTC):**
```
backupId: 20260817-020001
completedAt: 2026-08-17T02:00:19+00:00
FRESH ageHours=5.41 thresholdHours=26.0
```

**Safe simulation:**
```
completedAt: 2026-08-01T02:00:00+00:00
STALE ageHours=389.47 thresholdHours=26.0
```

**Gap:** Script prints `STALE` but **exit code remains 0** — cannot drive cron alert without parsing output (P1-14-003).

**Test status:** PASS (detection works); alerting MANUAL

---

## 15. Backup Failure Detection

**Isolated simulation** (`BACKUP_ROOT=/tmp/phase14-fail-test`, `BACKUP_TEST_SKIP_UPLOADS=1`):
- Backup failed with reason recorded
- `latest-failure.json` written
- `latest-success.json` on production **not** advanced
- Syslog `user.err` entries generated

**Production latest failure** (Phase 15A test, not production corruption):
```json
{"backupId":"20260815-080856","reason":"Simulated uploads failure (BACKUP_TEST_SKIP_UPLOADS=1)"}
```

**False-success risk:** **NO** — DB artifact validated with `pg_restore --list`; uploads validated with tar + R4 POD canary; manifest records validation status.

**Test status:** PASS

---

## 16. Two-Failure Stop Rule

**Pilot rule:** 2 consecutive **unattended** (02:00) backup failures → STOP NEW ONBOARDING

**Automatic counter:** **NOT PRESENT**

**Manual execution procedure** (documented in monitoring runbook):
```bash
grep 'Finished' /var/log/demaxtore-backup.log | grep '02:00' | tail -5
```
Inspect last two scheduled runs. Current production last two unattended runs:
- `20260816-020001` → SUCCESS
- `20260817-020001` → SUCCESS

**Test status:** MANUAL (procedure defined, executable)

---

## 17. Real Unattended Post-15A Backup

**Status:** **PASS — OBSERVED**

| Field | Value |
|---|---|
| Backup ID | `20260817-020001` |
| Started | `2026-08-17T02:00:01+00:00` |
| Completed | `2026-08-17T02:00:19+00:00` |
| Trigger | cron (unattended) |
| DB artifact | `dmx.dump` — 35.7 MB, `pg_restore --list` validated |
| Uploads artifact | `uploads.tar.gz` — 121.7 MB, R4 POD canary present |
| Manifest | `status: SUCCESS`, both validations SUCCESS |
| Syslog | 12 `demaxtore-backup` entries in journal 01:50–02:10 window |
| Prior unattended | `20260816-020001` SUCCESS (17s) |

Also observed in `/var/log/demaxtore-backup.log` — not scheduler-equivalent; **real cron execution**.

---

## 18. Off-Host Backup Risk

| Field | Value |
|---|---|
| Status | **NOT AVAILABLE** (`offHostStatus: not_configured`) |
| Accepted pilot risk | **YES** |
| Impact | Total host loss can destroy live data and local backups |

**Not remediated in Phase 14** — accurately carried forward.

---

## 19. Disk Capacity / Alerting

| Mount / path | Used | Available | % |
|---|---|---|---|
| `/` (root) | 71G | 123G | 37% |
| `.data/backups` | 996M | — | — |
| `apps/backend/.data/uploads` | 130M | — | — |
| Retained backup sets | 8 | 14-day retention | — |

**Could disk fill silently?** Yes — no automatic alert. At current growth rates, not imminent.

**Disk alerting:** **NOT PRESENT** — manual `df` in daily check.

**Log growth risk (P2):** `/var/log/demaxtore-node-backend.log` is 48M and **not** covered by `/etc/logrotate.d/demaxtore` (which rotates `/var/log/demaxtore/*.log` only). Long-term unbounded growth possible.

**Test status:** MANUAL for capacity; P2 for logrotate path mismatch

---

## 20. Application Error / 5xx Visibility

| Error type | Where it appears |
|---|---|
| Uncaught exception | `/var/log/demaxtore-node-backend.log` (pino JSON) |
| HTTP 5xx | Same log file |
| Prisma/Redis errors | Same log file |
| nginx access 5xx | `/var/log/nginx/*.log` (rotated daily, 14-day retention) |

**Automatic 5xx detection/metrics:** **NOT PRESENT**  
**Sudden 5xx increase detection:** Manual log review only  
**Safe production 5xx injection:** Not performed (no safe endpoint)

**Test status:** MANUAL

---

## 21. Auth / Rate-Limit Visibility

Phase 13 abuse testing not repeated.

| Signal | Visibility |
|---|---|
| `RATE_LIMITED` (429) | Application security audit log + HTTP response |
| `RATE_LIMIT_UNAVAILABLE` (503) | App log when Redis unreachable |
| Credential spray | Rate limiter + fail-closed on Redis loss |

**Automatic security alerting:** NOT PRESENT — forensic log visibility sufficient for controlled pilot.

**Test status:** PASS (visibility) / MANUAL (alerting)

---

## 22. Control Tower Operational Visibility

**Admin UI:** `/admin/dashboard` — loads with attention widgets (verified in prior phases; API validated here)

**API spot-check (authenticated admin):**

| Endpoint | Status | Notes |
|---|---|---|
| `GET /control-tower/dashboard` | 200 | Import tower — KPIs, pipeline, 10 operational risks |
| `GET /control-tower/ops-dashboard` | 200 | Overview, alerts, SLA, freight commercial |
| `GET /control-tower/overview` | 200 | Open/critical/warning alert counts |
| `GET /control-tower/alerts` | 200 | Paginated alert list |
| `GET /exceptions?limit=2` | 200 | Exception list returns data |

**Test status:** PASS

---

## 23. Customs / Inland / Landed Cost Signals (R4 read-only)

| Signal | Endpoint | Result |
|---|---|---|
| Customs case | `GET /customs/cases/{R4}` | `status=CLEARED`, `readinessStatus=READY_FOR_BROKER` |
| Customs readiness | `GET /customs/cases/{R4}/readiness` | `READY_FOR_BROKER`, `blockingCount=0` |
| Inland delivery | `GET /inland/{R4_INLAND}` | `status=DELIVERED` |
| Landed cost | `GET /landed-cost/{R4_LC}` | 200 — record present |
| Import tower risks | `GET /control-tower/dashboard` | `operationalRisks` length 10 |

Historical R4 semantics not "fixed" — documented as visible.

---

## 24. Log Rotation / Retention

| Log | Rotation | Notes |
|---|---|---|
| nginx | daily, 14 rotate | `/etc/logrotate.d/nginx` |
| journald | 98.1M cap | `journalctl --disk-usage` |
| `/var/log/demaxtore/*.log` | daily, 14 rotate | PM2-era paths; mostly empty now |
| `/var/log/demaxtore-node-backend.log` | **NOT ROTATED** | 48M, systemd append target — **P2** |
| backup log | Small (7.1K) | Low volume |

---

## 25. Daily Pilot Monitoring Procedure

**Defined in:** `docs/pilot-operations/monitoring-runbook.md`

**Minimum daily check (~5 min):**
1. `curl /api/healthz` + `/api/ready`
2. `systemctl is-active demaxtore-workspace-backend`
3. `bash scripts/backup-status.sh` — confirm FRESH, no recent unattended FAIL
4. `df -h /` + backup/uploads `du`
5. Control Tower attention review (UI or API)
6. Escalate per incident classification

**Owner:** OPS (daily) · ENGINEERING (incident-only)

---

## 26. Incident / Stop Rules

See monitoring runbook §7. Summary:

| Condition | Action |
|---|---|
| Backup stale >26h | STOP NEW ONBOARDING |
| 2 consecutive 02:00 backup failures | STOP NEW ONBOARDING |
| `ready:false` on DB/Redis/storage | STOP NEW ONBOARDING + escalate |
| Backend restart loop | STOP NEW ONBOARDING + escalate |
| Cross-tenant/security exposure | STOP + immediate engineering |
| Active transaction data integrity risk | STOP TRANSACTION + escalate |

**Escalation owner categories:** OPS (first) → ENGINEERING (P0/incident) → INFRA (disk/host) → COMMERCIAL (customer comms on active transaction)

---

## 27. Phase 15A Regression

| Item | Status |
|---|---|
| `backup-production.sh` hardened | Unchanged — verified working |
| `backup-status.sh` | Working — FRESH output |
| Cron `0 2 * * *` with `/bin/bash` | Installed |
| Uploads in backup | Present in `20260817-020001` |
| Manifest + validation | SUCCESS |
| Retention 14 days | 8 sets retained |
| Restore spot-check tooling | PASS from today's backup |
| R4 POD canary in backup | Present |

**Phase 14 did not regress Phase 15A.**

---

## 28. Carry-Forward Risks

| Risk | ID | Status |
|---|---|---|
| Off-host backup absent | Carry-forward P1 | OPEN — accepted pilot risk |
| Supplier branding asset IDOR | Phase 5 P1-001 | OPEN — not remediated |
| No automatic alerting | P1-14-001 | NEW — manual runbook compensates |
| No external availability probe | P1-14-002 | NEW — manual health check compensates |
| backup-status.sh no non-zero exit on STALE | P1-14-003 | NEW — ops must read output |

---

## 29. P0 / P1 / P2 Findings

### P0 — None

### New P1

| ID | Finding | Impact | Compensating control |
|---|---|---|---|
| P1-14-001 | No automatic human-visible alert for backup failure or API outage | Ops may not learn of failure until daily check or user report | Daily monitoring runbook |
| P1-14-002 | No external/independent availability probe | Backend death not auto-detected | Daily `/api/ready` + service status check |
| P1-14-003 | `backup-status.sh` exits 0 even when STALE | Cron cannot alert on exit code alone | Ops reads `STALE` text in daily check |

### P2

| ID | Finding |
|---|---|
| P2-14-001 | `demaxtore-node-backend.log` (48M) not in logrotate config |

### Carry-forward P1 (not new)

- Off-host backup (Phase 15A)
- Supplier branding asset IDOR (Phase 5)

---

## 30. Minimum Pilot Monitoring Matrix

| Signal | Detection | Automatic? | Human-visible? | Cadence | Action | Result |
|---|---|---|---|---|---|---|
| Backend process | systemd + healthz | Partial (systemd restart) | Manual | Daily | systemctl status | PASS |
| Public/API availability | /api/ready | No | Manual | Daily | curl + escalate | MANUAL |
| PostgreSQL | /api/ready db | No | Manual | Daily | ready check | PASS |
| Redis | /api/ready redis | No | Manual | Daily | ready check | PASS |
| Storage/uploads | /api/ready storage | No | Manual | Daily | ready check | PASS |
| Disk capacity | df | No | Manual | Daily | df -h | MANUAL |
| Backup freshness | backup-status.sh | No | Manual | Daily | FRESH/STALE | PASS |
| Backup failure | markers + syslog | No | Manual | Daily | read status/log | PASS |
| Backup restore | spot-check script | No | Manual | Weekly/ad-hoc | run spot-check | PASS |
| Unexpected 5xx | app log | No | Manual | Ad-hoc | tail/grep log | MANUAL |
| Auth/rate-limit infra | ready + app log | No | Manual | On incident | ready/redis check | PASS |
| Transaction attention | Control Tower | No | Manual | Daily | UI review | PASS |

---

## 31. Final Scorecard

```
PHASE 14 — MINIMUM PRODUCTION MONITORING VALIDATION

Backend Process Monitoring:
PASS

Public/API Availability Monitoring:
MANUAL

PostgreSQL Detection:
PASS

Redis Detection:
PASS

Storage/Uploads Detection:
PASS

Disk Capacity Monitoring:
MANUAL

Backup Freshness Detection:
PASS

Backup Failure Detection:
PASS

Backup Human-Visible Alert:
MANUAL

Two-Consecutive-Failure Stop Rule:
MANUAL

Real Unattended Post-15A Backup:
PASS

Restore Capability:
PASS

Unexpected 5xx Visibility:
MANUAL

Authentication / Rate-Limit Visibility:
PASS

Control Tower Operational Visibility:
PASS

Automatic Alert Delivery:
NOT PRESENT

Daily Manual Pilot Check:
DEFINED

Incident Owner / Escalation:
DEFINED

Backend Auto-Recovery:
PASS

Readiness False-Green Risk:
NO

Backup False-Success Risk:
NO

Off-Host Backup:
NOT AVAILABLE

Off-Host Backup Accepted Pilot Risk:
YES

Supplier Branding Asset IDOR Carry-Forward:
OPEN P1

Unexpected 5xx During Validation:
0

P0 Open:
0

New P1 Open:
3

Carry-Forward P1:
2

P2 Open:
1

PHASE 14 VERDICT:

PASS WITH MANUAL PILOT CONTROLS / ACCEPTED RISKS
```

---

## 32. Pass Gate Assessment

| Gate | Met? | Notes |
|---|---|---|
| Backend outage practically detectable | ⚠️ | Via manual daily `/api/ready` — not automatic |
| DB/Redis/storage failure detectable | ✅ | `/api/ready` |
| Readiness not falsely green | ✅ | Redis probed; safety gates enforced |
| Backup freshness measurable | ✅ | `backup-status.sh` |
| Backup failure measurable | ✅ | Markers + logs |
| False-success backup closed | ✅ | Artifact validation + canary |
| Stale >26h identifiable | ✅ | STALE text (exit code gap P1) |
| Two-failure stop rule executable | ✅ | Manual log procedure |
| Disk manually monitorable | ✅ | df in runbook |
| Daily check defined | ✅ | monitoring-runbook.md |
| Operator action defined | ✅ | Stop rules + escalation |
| Restore capability valid | ✅ | Spot-check PASS today |
| P0 = 0 | ✅ | |

**Verdict rule applied:** Did not award bare "PASS — MINIMUM PILOT MONITORING VERIFIED" because critical detection depends on documented manual procedures, not automatic alerting.

---

## 33. Artifacts Created

| Artifact | Purpose |
|---|---|
| `docs/phase-14-minimum-production-monitoring-validation.md` | This report |
| `docs/pilot-operations/monitoring-runbook.md` | Daily Ops procedure |
| `scripts/phase-14-monitoring-validation.sh` | Repeatable read-only validation |

---

## 34. After Phase 14

- **DO NOT START SPRINT 43**
- **Next:** Phase 16 — UI / I18N Launch Hygiene
- Then: Final pre-customer smoke → Customer #1

---

*Phase 14 complete. Prove operability. Document reality. Stop.*
