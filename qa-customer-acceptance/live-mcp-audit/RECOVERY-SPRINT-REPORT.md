# Production Recovery Sprint — Final Report

**Date:** 2026-06-26  
**Evidence:** Playwright audits + live curl health checks

---

## 1. Evidence — Pre-flight questions

| # | Question | Answer |
|---|----------|--------|
| 1 | `apps/frontend/src/store/auth.store.ts` in repo? | **Was missing** — never committed to git; restored from production bundle `index-B8wcXPAq.js` |
| 2 | Production build commit | **Unknown** — dist has no embedded commit; prior dist timestamp **2026-06-25 13:43 UTC** (`index-B8wcXPAq.js`) |
| 3 | Repo commit | `6f553e8` — `feat: harden production workflows for Sprint D` (+ large uncommitted working tree) |
| 4 | Same commit? | **NO** — sources were incomplete vs live dist; repo had uncommitted changes |
| 5 | Deployed dist last build? | **Was stale** — now replaced **2026-06-26 07:28 UTC** (`index-EKSHK_NZ.js`) |

### Other missing sources (restored from bundle)

- `layouts/EmbedShellLayout.tsx`
- `layouts/components/MobileNav.tsx`
- `features/trade-documents/components/TradeDocumentsTab.tsx`

---

## 2. Build

| Step | Result |
|------|--------|
| `yarn build` (apps/frontend) | **PASS** — tsc + vite, 22.6s |
| `auth.store.test.ts` | **3/3 PASS** |

---

## 3. Deploy

| Service | Check | Result |
|---------|-------|--------|
| Frontend | `GET https://workspace.demaxtore.com/` | **200** |
| Backend | `GET /api/healthz` | **200** `{"status":"ok"}` |
| FreightIQ | `GET https://freightiq.demaxtore.com/health` | **200** `{"ok":true}` |
| CommodityBid | `GET /api/commoditybid/workspaces` (auth) | **200** |

Nginx root: `apps/frontend/dist` — new build live without nginx reload.

---

## 4. Buyer

| Test | Result |
|------|--------|
| Full audit (17 tests) | **17/17 PASS** |
| Invalid order UUID `00000000-…-0099` | **PASS** — `notFound: true`, `order-loading: false` |
| API | 404 on order endpoints (expected) |

---

## 5. Supplier

| Test | Result |
|------|--------|
| Full audit | **12/12 PASS** |

---

## 6. Admin

| Test | Result |
|------|--------|
| Full audit | **12/12 PASS** |
| `/admin/users` | → `/sales/dashboard` ✓ |
| `/admin/shipments` | → `/shipments/portfolio` ✓ |
| `/admin/notifications` | → `/notifications` ✓ |
| `/admin/analytics` | → `/operations/executive` ✓ |
| `/admin/settings` | → `/operations/system` ✓ |

No 404 ghost pages on legacy admin URLs.

---

## 7. Certification

### **READY WITH RISKS**

**Why not NOT READY:** Build passes, new dist deployed, buyer IDOR fixed, admin redirects live, all three role audits green.

**Risks:**

1. Restored source files were **reconstructed from minified bundle**, not git — subtle drift possible.
2. Repo at `6f553e8` with **large uncommitted diff** — production frontend now ahead of committed source.
3. Backend not rebuilt this sprint — pm2 still on prior backend dist.
4. JWT still in `localStorage` (`dmx.auth`) — pre-existing security posture.

**Recommended follow-up:** Commit restored sources + sprint fixes; tag release; embed build commit in CI artifact.
