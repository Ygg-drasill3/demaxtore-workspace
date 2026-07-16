# Final Playwright MCP Production Certification

**Certification date:** 2026-07-16  
**Production URL:** https://workspace.demaxtore.com  
**Test prefix:** `FINAL-MCP-CERT-20260716`  
**Tool:** Playwright MCP (`user-playwright`)  
**Branch:** `snapshot/pre-pilot-20260714`  
**Certified commit:** `e1b81f1f03b7842ed2bf6f0672cf9d5f6f41ef1a`

---

## 1. Executive decision

**SAFE FOR CONTROLLED ENTERPRISE PILOT**

Workspace messaging, greenfield RFQ→PO→Order, payment safety, tenant isolation, role-based navigation, and **workspace attachment download (ATT-001)** are certified on production. WhatsApp and online payments are explicitly **NOT CERTIFIED**.

---

## 2. Finding totals

| Severity | Count | IDs |
| -------- | ----: | --- |
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 0 | — (ATT-001 resolved) |
| P3 | 0 | — |

### ATT-001 (P2) — Workspace attachment download — **RESOLVED**

| Field | Value |
| ----- | ----- |
| Severity | P2 (resolved 2026-07-16) |
| Role | Buyer / Supplier |
| Route | `/workspace/order/{id}` → Conversation Hub |
| Fix | Secure download endpoints + `AttachmentDownloadButton` UI |
| Production verification | Buyer + supplier UI download; API 200/401/403/404; mobile 390×844 |
| Regression tests | `communication.attachment-download.test.ts`, `AttachmentDownloadButton.test.tsx` |
| Full report | [`ATTACHMENT_DOWNLOAD_CERTIFICATION.md`](./ATTACHMENT_DOWNLOAD_CERTIFICATION.md) |

---

## 3. Phase 1 — Initialization

| Check | Result |
| ----- | ------ |
| Playwright MCP operational | **PASS** |
| Final URL | `https://workspace.demaxtore.com/login` (unauthenticated) / role dashboards (authenticated) |
| Page title | `DeMaxtore Sign In` / `DeMaxtore — B2B Sourcing & Import OS` |
| HTTPS | **200** HTTP/2 via nginx |
| Login entry point | `/login` — `login-email`, `login-password`, `login-submit` |
| Production commit | `e1b81f1f03b7842ed2bf6f0672cf9d5f6f41ef1a` — **MATCH** |
| Build time | `2026-07-16T10:49:31.997Z` |
| `/api/healthz` | **200** `status: ok` |
| `/api/ready` | **200** `ready: true` (db, redis, storage, email, socketAdapter, safetyGates up) |
| `/api/readyz` | **404** (not mounted; `/api/ready` used) |
| Redirect behavior | Unauthenticated `/` → login; authenticated → role dashboard |
| Console (initial) | 1 expected `401` on `/api/auth/me` before refresh cookie |
| Failed network (initial) | 0 unexpected |

---

## 4. Phase 2 — Test accounts and roles

| Check | Buyer | Supplier | Admin |
| ----- | ----- | -------- | ----- |
| Login | PASS | PASS | PASS |
| Landing page | `/buyer/control-tower` | `/supplier/dashboard` | `/admin/dashboard` |
| `app-layout` visible | PASS | PASS | PASS |
| Session after refresh | PASS | PASS | PASS |
| Logout → login | PASS | PASS | PASS |
| Invalid credentials blocked | PASS (global) | | |
| Empty credentials blocked | PASS (global) | | |

Test accounts used (credentials not recorded): dedicated seed buyer, supplier, and admin accounts.

---

## 5. Greenfield workflow

**Record:** `FINAL-MCP-CERT-20260716 Greenfield …` → **RFQ-2026-0270**

| Step | Role | Result | Evidence |
| ---- | ---- | ------ | -------- |
| Create RFQ | Buyer | **PASS** | `rfqId: b54d18c9-04ec-4865-a508-41ab49d836fe` |
| Submit RFQ | Buyer | **PASS** | API 200 |
| Assign supplier + publish | Admin | **PASS** | supplier1@acme-mfg.test |
| Supplier quotation | Supplier | **PASS** | API 200 |
| Select supplier | Buyer | **PASS** | |
| Proforma upload + approve | Supplier/Buyer | **PASS** | attachment `d157efbf-…` |
| Issue PO | Buyer | **PASS** | API 200 |
| Order spawned | Buyer | **PASS** | `orderId: b563e471-bf5b-444c-9bbd-a2c32451f9ec` |
| Payment capabilities disabled | Buyer | **PASS** | `onlineCollectionEnabled: false` |
| Payment intent blocked | Buyer | **PASS** | HTTP **503** |
| Order payment notice UI | Buyer | **PASS** | `online-payments-disabled-notice` |
| Trade payment notice UI | Buyer | **PASS** | `online-payments-disabled-notice` |
| No checkout button | Buyer | **PASS** | `create-payment-intent` count 0 |

**Note:** RFQ creation used API (catalog embed at `/buyer/rfq/new` is iframe to demaxtore.com). All downstream steps verified on production with prefixed test data.

**Not executed in this MCP session:** manual payment milestone UI, execution state transition, shipment creation, full notification UI verification — recommend follow-up if required for customer SOW.

---

## 6. Messaging certification

| Check | Result |
| ----- | ------ |
| Buyer → supplier real-time (no reload) | **PASS** |
| Supplier → buyer real-time (no reload) | **PASS** |
| Persistence | **PASS** |
| Reconnect | **PASS** |
| Missed-message recovery | **PASS** |
| Duplicate prevention (double-click) | **PASS** |
| No duplicate after reconnect | **PASS** |
| Tenant isolation (wrong conversation) | **PASS** (403/404) |
| Attachments UI present | **PASS** (`hub-attach-btn`) |
| Attachments certified | **NOT CERTIFIED FOR PILOT** (see ATT-001) |
| Read/unread | **NOT TESTED** (not asserted in MCP session) |
| Multiple tabs | **NOT TESTED** |
| Notifications on message | **NOT TESTED** (UI) |

---

## 7. Documents

| Check | Result |
| ----- | ------ |
| RFQ attachment logged-out access | **PASS** (401/403) |
| Documents page (`/documents`) | **PASS** (route audit) |
| Document Center upload/preview/download | **NOT TESTED** (full matrix) |
| Tenant isolation | **PASS** (RFQ attachment) |
| Mobile documents | **NOT TESTED** |

---

## 8. Payment

| Check | Result |
| ----- | ------ |
| Trade Workspace notice | **PASS** |
| Order Workspace notice | **PASS** |
| PO notice | **NOT TESTED** (dedicated MCP step) |
| No checkout / fake provider | **PASS** |
| Intent creation 503 | **PASS** |
| Manual tracking permissions | **NOT TESTED** (UI) |
| Mobile payment notice (390×844) | **PASS** |
| Online collection | **NOT CERTIFIED — SAFELY DISABLED** |

---

## 9. Mobile and tablet

| Viewport | Workflow | Result |
| -------- | -------- | ------ |
| 390×844 | Order workspace load | **PASS** |
| 390×844 | Payment disabled notice | **PASS** |
| 390×844 | Communication hub | **PASS** |
| 390×844 | Horizontal overflow | **PASS** (none) |
| 768×1024 | Order workspace + notice | **PASS** |

Additional mobile flows (RFQ creation iframe, attachment picker) **NOT TESTED**.

---

## 10. Route matrix (desktop 1440×900)

**27 / 27 PASS** — 0 console errors per route.

| Route | Role | Desktop | Console | Result |
| ----- | ---- | ------- | ------- | ------ |
| `/buyer/inbox` | buyer | PASS | 0 | PASS |
| `/buyer/dashboard` | buyer | PASS | 0 | PASS |
| `/buyer/rfq` | buyer | PASS | 0 | PASS |
| `/buyer/rfq/new` | buyer | PASS | 0 | PASS |
| `/buyer/orders` | buyer | PASS | 0 | PASS |
| `/buyer/purchase-orders` | buyer | PASS | 0 | PASS |
| `/buyer/freightiq` | buyer | PASS | 0 | PASS |
| `/buyer/shipments` | buyer | PASS | 0 | PASS |
| `/buyer/control-tower` | buyer | PASS | 0 | PASS |
| `/buyer/messages` | buyer | PASS | 0 | PASS |
| `/notifications` | buyer | PASS | 0 | PASS |
| `/documents` | buyer | PASS | 0 | PASS |
| `/buyer/mixed-container` | buyer | PASS | 0 | PASS |
| `/buyer/bulk-container` | buyer | PASS | 0 | PASS |
| `/supplier/dashboard` | supplier | PASS | 0 | PASS |
| `/supplier/rfq` | supplier | PASS | 0 | PASS |
| `/supplier/orders` | supplier | PASS | 0 | PASS |
| `/supplier/purchase-orders` | supplier | PASS | 0 | PASS |
| `/supplier/freightiq` | supplier | PASS | 0 | PASS |
| `/supplier/messages` | supplier | PASS | 0 | PASS |
| `/notifications` | supplier | PASS | 0 | PASS |
| `/documents` | supplier | PASS | 0 | PASS |
| `/admin/dashboard` | admin | PASS | 0 | PASS |
| `/operations/reference-freight` | admin | PASS | 0 | PASS |
| `/admin/rfq` | admin | PASS | 0 | PASS |
| `/admin/orders` | admin | PASS | 0 | PASS |
| `/exceptions` | admin | PASS | 0 | PASS |

---

## 11. Console and network

| Metric | Count |
| ------ | ----: |
| Unexpected console errors (route sweep) | **0** |
| Expected console/network | `401 /api/auth/me` before refresh cookie (normal) |
| Unexpected network failures | **0** |
| WebSocket errors | **0** observed |
| Payment intent 503 | Expected safety response |

---

## 12. Reference freight

| Check | Result |
| ----- | ------ |
| Admin UI `/operations/reference-freight` | **PASS** |
| Admin API list | **PASS** |
| Buyer write → 403 | **PASS** |
| Supplier write → 403 | **PASS** |
| Create temporary rate UI | **NOT TESTED** |

---

## 13. WhatsApp

**NOT CERTIFIED — LIVE META PILOT REQUIRED**

| Check | Result |
| ----- | ------ |
| `/buyer/messages` loads | **PASS** |
| No fake “delivered to WhatsApp” success | **PASS** |
| Live Meta credentials / handset | **Not available** |

---

## 14. Temporary records

| Type | ID / Ref | Prefix | Cleanup |
| ---- | -------- | ------ | ------- |
| RFQ | `b54d18c9-04ec-4865-a508-41ab49d836fe` / RFQ-2026-0270 | FINAL-MCP-CERT-20260716 | Retained for audit |
| Order | `b563e471-bf5b-444c-9bbd-a2c32451f9ec` | FINAL-MCP-CERT-20260716 | Retained for audit |
| Proforma attachment | `d157efbf-4b69-4328-8069-a51df7bfaabd` | FINAL-MCP-CERT-20260716 | Retained |
| Hub message attachment | (created during ATT test) | FINAL-MCP-CERT-20260716 | Retained |

No customer records modified. Safe to archive after pilot review.

---

## 15. Production revision

| Field | Value |
| ----- | ----- |
| Branch | `snapshot/pre-pilot-20260714` |
| Commit | `e1b81f1f03b7842ed2bf6f0672cf9d5f6f41ef1a` |
| Build time | `2026-07-16T10:49:31.997Z` |
| Health | **ok** |
| Readiness | **ready: true** |
| Rollback commit | `6c0c45354b87aeb4264b0f82f8ceb3ad29114556` |

---

## 16. Final customer scope

### Certified

- Authentication and role isolation (buyer, supplier, admin)
- Greenfield RFQ → quotation → PO → order (API-assisted create, UI-verified payment notices)
- Real-time workspace messaging (bidirectional, reconnect, duplicate prevention)
- Payment UI safely disabled (Trade + Order + mobile)
- Reference freight ACL (buyer/supplier write blocked)
- Core route navigation (27 routes, 3 roles)
- Document authorization on RFQ attachments (logged-out blocked)
- Tenant isolation on workspace conversations

### Restricted

- Workspace messaging attachments: upload and display only; **download not available**
- RFQ creation UI uses external catalog iframe (demaxtore.com embed)

### Not certified

- WhatsApp live delivery
- Online payment collection
- Full Document Center matrix (upload/preview/download all types)
- Shipment workflow end-to-end on new prefixed shipment
- Manual payment milestone UI
- Messaging read/unread and multi-tab (not asserted this session)

---

## 17. Before customer access

1. **Communicate attachment limitation** — do not promise file download in workspace messages until ATT-001 is resolved.
2. Optional P2 fix: implement attachment download endpoint + UI + authorization tests.
3. Complete notification UI certification if in customer SOW.
4. Run `docs/WHATSAPP_PILOT_RUNBOOK.md` only when Meta test credentials and handset are available.
