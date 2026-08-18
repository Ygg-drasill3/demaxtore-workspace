# DeMaxtore Live MCP Customer Audit Report

**Date:** 2026-06-26  
**Target:** https://workspace.demaxtore.com (+ FreightIQ embed)  
**Tooling:** Playwright MCP (`user-playwright`) — **Chrome DevTools MCP kurulu değil**  
**Mode:** Chromium (sunucu headless; headed display yok)  
**Evidence:** `qa-customer-acceptance/live-mcp-audit/{buyer,supplier,admin}/` — **40 PNG screenshots**

---

## MCP Coverage Disclaimer

| İstenen | Durum |
|---------|--------|
| Playwright MCP | ✅ Kullanıldı |
| Chrome DevTools MCP | ❌ MCP sunucusu yok |
| Headed browser | ❌ Linux sunucuda display yok |
| Tüm checklist maddeleri (upload, WS realtime, 9 breakpoint × 3 rol) | ⚠️ Kısmi — modül smoke + auth + RBAC + security |

---

## BUYER — **FAIL** (kritik UX bug)

**Hesap:** `buyer1@acme.test` / `Passw0rd!`

### PASS
| Alan | Kanıt |
|------|--------|
| Login / wrong password / hard refresh | `buyer/auth-01-wrong-password.png`, `auth-02-login-success.png`, `auth-03-hard-refresh.png` |
| Control Tower dashboard | `buyer/mod-dashboard.png` — KPI, charts, sidebar |
| RFQ list | `buyer/mod-rfq-list.png` |
| Orders list | `buyer/mod-orders-list.png` |
| Shipments | `buyer/mod-shipments.png` |
| Messages | `buyer/mod-messages.png` |
| CommodityBid embed | `buyer/mod-commoditybid.png` |
| FreightIQ embed (Hello screen) | `buyer/mod-freightiq-embed.png` |
| RBAC — `/admin/users` | `buyer/rbac-admin-users.png` — "Page not found" (doğru) |
| Responsive 390px | `buyer/responsive-390-dashboard.png` |
| Supplier data isolation | API 403 on foreign order freight |

### FAIL — Bugs

#### BUG-B001 · **HIGH** · Order workspace IDOR/404 → sonsuz "Loading…"
- **Adımlar:** `/workspace/order/00000000-0000-0000-0000-000000000099`
- **Beklenen:** "Page not found"
- **Gerçek:** `Loading…` takılı kalıyor
- **Kanıt:** `buyer/idor-random-order.png`, `buyer/idor-retest-after-fix.png`
- **Console:** 404 on `/api/orders/{id}`, 403 on freightiq
- **Root cause:** `OrderWorkspacePage.tsx` — `if (isLoading || !order)` → 404 sonrası `!order` hep true
- **Fix:** Kodda düzeltildi (`isError` + `NotFoundPage`) — **deploy edilemedi** (aşağıdaki BUG-INFRA)

#### BUG-B002 · **LOW** · Console 401 noise
- `/api/auth/refresh` 401 before login (expected) — console error olarak görünüyor

#### BUG-B003 · **MEDIUM** · Security — JWT in localStorage
- Key: `dmx.auth` — access token pattern detected
- Refresh token httpOnly cookie (iyi); access token LS'de (SPA standardı ama XSS riski)

### Performance (buyer modülleri)
- Ortalama sayfa load: **2.1–2.5s** (domcontentloaded + 2s wait)
- En yavaş: dashboard ~2.5s

---

## SUPPLIER — **PASS** (smoke scope)

**Hesap:** `supplier1@acme-mfg.test` / `Passw0rd!`

### PASS
| Alan | Kanıt |
|------|--------|
| Login → supplier dashboard | `supplier/auth-login.png` |
| Orders, RFQ, messages, CommodityBid, FreightIQ | `supplier/mod-*.png` |
| RBAC — buyer dashboard redirect | URL stays `/supplier/dashboard` after visiting `/buyer/dashboard` |
| RBAC — admin users | Page not found (doğru) |

### Notes
- Console: 1× 401 refresh (pre-auth noise)
- `/supplier/settings` → SPA 404 page (route yok) ama login'e düşmüyor

---

## ADMIN — **FAIL** (eksik admin modülleri)

**Hesap:** `ugur@demaxtore.com` / `Demaxtore35`

### PASS
| Alan | Kanıt |
|------|--------|
| Login → admin dashboard | `admin/auth-login.png`, `admin/mod-dashboard.png` |
| Orders, RFQ, CommodityBid, FreightIQ embed | `admin/mod-orders.png`, `mod-rfq.png`, etc. |
| FreightIQ demo vessels (external) | `admin/mod-demo-vessels-ext.png` |

### FAIL — Bugs

#### BUG-A001 · **HIGH** · Admin routes missing (404 UI)
Routes tested but **no implementation** in `routes/index.tsx`:

| URL | Kanıt |
|-----|--------|
| `/admin/users` | `admin/mod-users.png` |
| `/admin/shipments` | `admin/mod-shipments.png` |
| `/admin/notifications` | `admin/mod-notifications.png` |
| `/admin/analytics` | `admin/mod-analytics.png` |
| `/admin/settings` | `admin/mod-settings.png` |

Admin sidebar'da "Sales Control", "Freight ops" var; Users/Shipments/Analytics/Settings yok.

---

## INFRA — **CRITICAL**

#### BUG-INFRA-001 · `apps/frontend/src/store/auth.store.ts` **MISSING**
- Repo'da dosya yok; sadece test dosyası var
- `yarn build` / `vite build` **fail**
- Production eski `dist/` (2026-06-25) üzerinden çalışıyor
- **IDOR fix deploy edilemedi**

---

## SECURITY Summary

| Check | Buyer | Supplier | Admin |
|-------|-------|----------|-------|
| RBAC UI deny | ✅ | ✅ | N/A |
| API 403/404 on foreign order | ✅ | — | — |
| JWT in localStorage | ⚠️ dmx.auth | — | — |
| Refresh in console | ✅ not exposed | — | — |
| Broken access (data leak) | ❌ not found in smoke | — | — |

---

## GENEL Metrikler

| Metrik | Değer |
|--------|-------|
| Toplam screenshot | **40** |
| Console errors (unique sessions) | ~15 |
| Failed API (expected 401/404) | ~14 |
| Bugs Critical | **1** (auth.store / deploy) |
| Bugs High | **2** (IDOR loading, admin ghost routes) |
| Bugs Medium | **1** (JWT in LS) |
| Bugs Low | **1** (401 console noise) |

---

## FINAL SCORES (smoke scope)

| Alan | Skor |
|------|------|
| Buyer Experience | 6/10 |
| Supplier Experience | 8/10 |
| Admin Experience | 5/10 |
| Workspace | 7/10 |
| CommodityBid | 7/10 (embed loads) |
| FreightIQ | 7/10 (embed loads) |
| Performance | 7/10 |
| Security | 6/10 |
| Accessibility | Not fully tested |
| **Overall** | **6/10** |

---

## FINAL DECISION

# **NOT READY**

PRODUCTION READY kriterleri karşılanmıyor:
- Buyer tam yolculuk PASS değil (IDOR/404 UX)
- Admin tam yolculuk PASS değil (Users/Shipments/Analytics/Settings yok)
- Deploy pipeline kırık (`auth.store.ts` eksik)
- Chrome DevTools MCP audit yapılmadı
- Documents upload, WebSocket realtime, full responsive matrix test edilmedi

---

## Kritik Soru Cevabı

**Gerçek bir Buyer, Supplier ve Admin bugün başlarsa kritik problem kalıyor mu?**

**Evet:**

1. **Buyer/Supplier** — Var olmayan veya yetkisiz order URL'sinde sayfa **sonsuz Loading** gösterir (kafa karıştırıcı, destek yükü).
2. **Admin** — Users, Shipments, Notifications, Analytics, Settings sayfaları **yok**; operasyon ekibi bu URL'lere gidemez.
3. **DevOps** — Frontend kaynak kodu **build edilemiyor**; bug fix deploy edilemiyor, production stale dist'e bağımlı.
4. **FreightIQ** — Önceki oturumda demo vessel → buyer offer köprüsü eklendi; bu audit'te buyer embed yükleniyor ama tam offer flow re-test edilmedi.

**Kalmadığını söyleyemeyiz** — yukarıdaki maddeler MCP screenshot ve network kanıtıyla doğrulandı.

---

## Fix Status

| Bug | Fix | Deploy |
|-----|-----|--------|
| BUG-B001 IDOR loading | `OrderWorkspacePage.tsx` patched | ❌ blocked by BUG-INFRA-001 |
| BUG-A001 admin routes | Not fixed | — |
| BUG-INFRA-001 auth.store | Not fixed | — |
