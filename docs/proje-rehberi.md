# DeMaxtore — Kapsamlı Proje Rehberi

> **Sürüm:** 0.2.0  
> **Son güncelleme:** 2026-06-15  
> **Kod tabanı:** `/var/www/demaxtore/DemaxtoreSolitions-main`

Bu belge, DeMaxtore platformunun nasıl çalıştığını uçtan uca açıklar: mimari, veri modeli, iş akışları, API’ler, frontend yapısı, güvenlik, gerçek zamanlı iletişim ve geliştirme ortamı.

---

## İçindekiler

1. [Platform Nedir?](#1-platform-nedir)
2. [Monorepo Yapısı](#2-monorepo-yapısı)
3. [Teknoloji Yığını](#3-teknoloji-yığını)
4. [Mimari Genel Bakış](#4-mimari-genel-bakış)
5. [Backend — Nasıl Çalışır?](#5-backend--nasıl-çalışır)
6. [Frontend — Nasıl Çalışır?](#6-frontend--nasıl-çalışır)
7. [Veritabanı ve Prisma](#7-veritabanı-ve-prisma)
8. [Workspace Modeli ve FSM](#8-workspace-modeli-ve-fsm)
9. [Kimlik Doğrulama ve Yetkilendirme](#9-kimlik-doğrulama-ve-yetkilendirme)
10. [İş Modülleri (Detaylı)](#10-iş-modülleri-detaylı)
11. [Sprint 15 — Birleşik Yürütme Katmanı](#11-sprint-15--birleşik-yürütme-katmanı)
12. [Gerçek Zamanlı İletişim (Socket.io)](#12-gerçek-zamanlı-iletişim-socketio)
13. [Arka Plan İşleri ve Zamanlayıcılar](#13-arka-plan-işleri-ve-zamanlayıcılar)
14. [Contracts Paketi](#14-contracts-paketi)
15. [Test Altyapısı](#15-test-altyapısı)
16. [Geliştirme ve Deployment](#16-geliştirme-ve-deployment)
17. [Ortam Değişkenleri](#17-ortam-değişkenleri)
18. [Dosya ve Klasör Haritası](#18-dosya-ve-klasör-haritası)
19. [Tipik Bir Ticaretin Yaşam Döngüsü](#19-tipik-bir-ticaretin-yaşam-döngüsü)

---

## 1. Platform Nedir?

**DeMaxtore**, B2B tedarik ve ithalat operasyonları için tasarlanmış **workspace merkezli** bir ticaret işletim sistemidir (Trade OS). Flexport benzeri bir dijital yürütme deneyimi hedefler:

- **Kaynak bulma (Sourcing):** RFQ, CommodityBid müzayedesi, SmartContainer (karışık konteyner), BulkContainer (dökme konteyner)
- **Yürütme (Execution):** Sipariş, satın alma emri (PO), FreightIQ navlun, sevkiyat takibi
- **Operasyon (Operations):** Control Tower uyarıları, belge merkezi, istisna yönetimi, büyüme/pazar analitiği

### Temel tasarım ilkesi: Workspace

Platformdaki her iş süreci (RFQ, sipariş, sevkiyat vb.) bir **`Workspace`** kaydıdır. Workspace:

- Bir **durum makinesi (FSM)** state’i taşır (`RFQ_DRAFT`, `ORDER_IN_PRODUCTION`, `SHIPMENT_IN_TRANSIT` vb.)
- **Katılımcılar** (alıcı, tedarikçi, operasyon) üzerinden erişim kontrolü yapar
- **Timeline**, **audit log** ve **bildirim** üretir
- Gerektiğinde **alt workspace** doğurur (`spawnedFromId` zinciri)

Bu sayede RFQ → Order → Shipment zinciri tek bir trade graph olarak takip edilebilir.

### Kullanıcı rolleri

| Rol | Kim? | Tipik ekran |
|-----|------|-------------|
| `BUYER` | İthalatçı / alıcı | `/buyer/dashboard`, RFQ oluşturma, sevkiyat portföyü |
| `SUPPLIER` | Üretici / tedarikçi | `/supplier/dashboard`, teklif verme, sipariş yürütme |
| `ADMIN` | DeMaxtore operasyon | `/admin/dashboard`, `/operations`, Control Tower |

---

## 2. Monorepo Yapısı

Proje **Yarn workspaces** ile tek repoda birden fazla paketi yönetir:

```
DemaxtoreSolitions-main/
├── apps/
│   ├── backend/          @dmx/backend    — Express API + Prisma + Socket.io
│   ├── frontend/         @dmx/frontend   — React SPA (Vite)
│   └── e2e/              @dmx/e2e       — Playwright uçtan uca testler
├── packages/
│   └── contracts/        @dmx/contracts  — Paylaşılan FSM, Zod, DTO, socket event’leri
├── tools/
│   ├── enterprise-validation/   — Sprint 9 kurumsal doğrulama
│   └── platform-readiness/      — Sprint 16 üretim hazırlık denetimi
├── docs/                 — Sprint TDD’leri, state machine dokümanları, raporlar
├── scripts/              — Smoke test, performans benchmark
└── package.json          — Kök workspace tanımı
```

### Paketler arası bağımlılık

```
@dmx/frontend  ──imports──►  @dmx/contracts
@dmx/backend   ──imports──►  @dmx/contracts
@dmx/e2e       ──test eder──►  frontend + backend (HTTP + tarayıcı)
```

**Contracts paketi** hem backend hem frontend’in aynı FSM geçişlerini, API şemalarını ve socket event isimlerini kullanmasını sağlar — tip uyumsuzluğu ve sözleşme kayması önlenir.

---

## 3. Teknoloji Yığını

| Katman | Teknoloji | Sürüm / Not |
|--------|-----------|-------------|
| Dil | TypeScript | Node ≥ 20 |
| Frontend framework | React | 18 |
| Build (FE) | Vite | 5 |
| Stil | TailwindCSS | Utility-first CSS |
| Routing (FE) | React Router | 6 |
| Server state | TanStack React Query | API cache, refetch |
| Client state | Zustand | Auth, UI (sidebar vb.) |
| Form | React Hook Form + Zod | Validasyon |
| Backend framework | Express | 4, ESM (`"type": "module"`) |
| ORM | Prisma | 5 |
| Veritabanı | PostgreSQL | 16 |
| Auth | JWT + httpOnly cookie | Access 15 dk, refresh 7 gün |
| Şifre | bcryptjs | Hash + brute-force koruması |
| Realtime | Socket.io | 4 |
| Log | Pino | JSON structured logging |
| E-posta | console / Resend / SMTP | Ortama göre |
| Unit test | Vitest | contracts + backend |
| E2E test | Playwright | apps/e2e |
| Deploy hedefi | Ubuntu VPS + PM2 + Nginx | docs’ta belgelenmiş |

**Kullanılmayan / yasak stack:** FastAPI, MongoDB, CRA, Django, Laravel, Firebase, Supabase, Next.js (Sprint 1 stack kilidi).

---

## 4. Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                        KULLANICI TARAYICISI                      │
│  React SPA (:3000)  —  Zustand (auth)  —  React Query (API)     │
│  Socket.io client   —  React Router   —  Feature modülleri      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP /api  +  WebSocket /socket.io
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND (:3001)                        │
│  Middleware: auth, rate-limit, idempotency, validate, error       │
│  Modüller: rfq, order, shipment, freightiq, control-tower, ...   │
│  applyTransition() → FSM + timeline + notification + socket      │
│  Schedulers: RFQ deadline, CommodityBid auction, CT scan, ...    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma Client
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                  │
│  workspaces, users, orders, shipments, alerts, documents, ...   │
│  State-guard SQL trigger’ları (FSM dışı geçişi engeller)        │
└─────────────────────────────────────────────────────────────────┘

         @dmx/contracts  ◄──  FSM tanımları, Zod şemaları, DTO’lar
              ▲
              │ import
         backend + frontend
```

### İstek yaşam döngüsü (örnek: RFQ state değişikliği)

1. Kullanıcı frontend’de bir aksiyon butonuna tıklar (ör. “Submit RFQ”)
2. Frontend `POST /api/rfq/:id/actions/submit` çağırır (Bearer JWT + Idempotency-Key)
3. `requireAuth` middleware JWT’yi doğrular → `req.user` doldurulur
4. `rfq.controller` → `rfq.service.applyTransition(actor, workspaceId, "submit")`
5. Service:
   - `canAccessWorkspace()` ile ACL kontrolü
   - `findRfqTransition(from, "submit")` ile contracts’tan geçiş bulur
   - PostgreSQL `SET LOCAL app.fsm_authorised = 'true'` (trigger bypass)
   - `SELECT ... FOR UPDATE` ile workspace kilidi
   - State güncelleme, `TimelineEvent` oluşturma, `Notification` oluşturma
   - `AuditLog` yazma
   - `socketBus.scheduleEmit()` ile commit sonrası realtime event
6. JSON yanıt frontend’e döner; React Query cache invalidate edilir; socket event UI’ı günceller

---

## 5. Backend — Nasıl Çalışır?

### 5.1 Giriş noktaları

| Dosya | Görev |
|-------|-------|
| `apps/backend/src/server.ts` | Process boot: DB probe, socket init, scheduler’lar, graceful shutdown |
| `apps/backend/src/app.ts` | Express app: CORS, helmet, cookie-parser, `/api` mount, error handler |
| `apps/backend/src/routes.ts` | Tüm modül route’larının `/api` altında birleştirilmesi |

### 5.2 Boot sırası (`server.ts`)

1. `prisma.$queryRaw\`SELECT 1\`` — DB bağlantı testi (başarısızsa process exit)
2. `reconcileStaleRunningJobs()` — takılı kalmış RUNNING job’ları temizle
3. `buildApp()` + HTTP server oluştur
4. `initSocket(server)` — Socket.io bağla
5. Arka plan işçilerini başlat:
   - `startSlaWorker()` — proforma SLA hatırlatma e-postası
   - `startCommodityBidScheduler()` — müzayede motoru
   - `startRfqScheduler()` — RFQ deadline + proforma SLA
   - `startControlTowerScheduler()` — alert tarama
   - `startTrackingScheduler()` — denizcilik takip sync
6. Periyodik stale job reconciliation interval
7. `server.listen(env.PORT)` — varsayılan **3001** (dev) veya **8001** (.env)

### 5.3 Middleware katmanı

| Middleware | Dosya | Ne yapar? |
|------------|-------|-----------|
| `requireAuth` | `middleware/auth.ts` | `Authorization: Bearer` JWT doğrular |
| `requireRole` | `middleware/auth.ts` | BUYER / SUPPLIER / ADMIN kontrolü |
| `idempotency` | `middleware/idempotency.ts` | POST/PUT/PATCH için `Idempotency-Key` — çift tıklama koruması |
| `rate-limit` | `middleware/rate-limit.ts` | Login, socket handshake, telemetry burst limit |
| `validate` | `middleware/validate.ts` | Zod ile body/query doğrulama |
| `asyncHandler` | `middleware/asyncHandler.ts` | Async route hata yakalama |
| `error` | `middleware/error.ts` | Merkezi hata formatı (`AppError`, 404) |

### 5.4 Modül yapısı (her domain için tipik)

```
apps/backend/src/modules/rfq/
├── rfq.routes.ts        — Express router tanımları
├── rfq.controller.ts    — HTTP handler’lar (ince katman)
├── rfq.service.ts       — İş mantığı, applyTransition
├── rfq.policy.ts        — ACL: kim hangi workspace’e erişebilir
├── rfq.scheduler.ts     — Deadline / SLA zamanlayıcı
└── rfq.service.read.ts  — Okuma sorguları (ayrı dosya)
```

**40+ modül klasörü** `apps/backend/src/modules/` altında: `auth`, `rfq`, `commoditybid`, `order`, `shipment`, `freightiq`, `control-tower`, `trade`, `document-center`, `exception-hub`, `mixed-container`, `bulk-container`, `purchase-order`, `onboarding`, `jobs`, vb.

### 5.5 API route haritası (`/api/...`)

| Prefix | Modül | Erişim |
|--------|-------|--------|
| `/healthz` | Health | Public |
| `/auth` | Login, refresh, logout, me | Public / Auth |
| `/notifications` | Bildirimler | Auth |
| `/rfq`, `/admin/rfq` | RFQ workspace | BUYER / ADMIN |
| `/rfq/:id/quotations` | Teklifler | BUYER, SUPPLIER |
| `/commoditybid`, `/admin/commoditybid` | CommodityBid müzayede | BUYER / ADMIN |
| `/orders`, `/orders/:id/documents` | Sipariş workspace | Participant |
| `/shipments`, `/shipments/:id/documents` | Sevkiyat workspace | Participant |
| `/shipments/portfolio` | Shipment Portfolio (Sprint 15B) | Auth |
| `/control-tower` | Operasyon merkezi | ADMIN |
| `/freightiq` | Navlun yönetimi | BUYER, ADMIN |
| `/trades/:id/workspace` | Trade Workspace (Sprint 15A) | Participant |
| `/trades/:id/documents` | Trade belgeleri paneli | Participant |
| `/trades/:id/exceptions` | Trade istisnaları | Participant |
| `/documents` | Document Center (Sprint 15C) | Auth |
| `/exceptions` | Exception Hub (Sprint 15D) | Auth |
| `/purchase-orders` | PO yönetimi | Participant |
| `/mixed-containers`, `/admin/mixed-containers` | SmartContainer | BUYER / ADMIN |
| `/bulk-containers`, `/admin/bulk-container` | BulkContainer | BUYER / ADMIN |
| `/workspace-communication/:type/:id` | Workspace mesajlaşma | Participant |
| `/system` | Job health, backup | ADMIN |
| `/onboarding` | Guided onboarding | Auth |
| `/growth`, `/market`, `/scale` | Executive analytics | ADMIN |

Tam liste: `apps/backend/src/routes.ts`

---

## 6. Frontend — Nasıl Çalışır?

### 6.1 Bootstrap akışı

```
main.tsx
  └── QueryClientProvider (React Query)
        └── BrowserRouter
              └── App.tsx
                    └── auth rehydration bekler (sessionStorage)
                          └── AppRoutes (lazy-loaded sayfalar)
```

### 6.2 Layout’lar

| Layout | Dosya | Kullanım |
|--------|-------|----------|
| `AuthLayout` | `layouts/AuthLayout.tsx` | `/login`, `/forgot-password` |
| `AppLayout` | `layouts/AppLayout.tsx` | Sidebar + Header + ana içerik |
| `EmbedShellLayout` | `layouts/EmbedShellLayout.tsx` | FreightIQ / CommodityBid iframe (tam ekran) |

### 6.3 Route guard’lar

- **`RequireAuth`** — Giriş yapmamış kullanıcıyı `/login`’e yönlendirir
- **`RequireRole`** — Rol bazlı erişim (`allow={["BUYER"]}` vb.)
- **`RootRedirect`** — `/` → `ROLE_DASHBOARD[user.role]` (buyer/supplier/admin dashboard)

Dashboard yönlendirmeleri `@dmx/contracts/auth` içindeki `ROLE_DASHBOARD` sabitinden gelir.

### 6.4 Feature modülleri

Her iş alanı `apps/frontend/src/features/` altında kendi klasöründe:

```
features/rfq/
├── pages/           — RfqListPage, RfqCreatePage, RfqWorkspacePage
├── components/      — Tekrar kullanılan UI parçaları
├── lib/             — rfq.api.ts (axios wrapper)
└── hooks/           — useRfqWorkspace vb.
```

**Tüm feature klasörleri:** `auth`, `rfq`, `commoditybid`, `order`, `shipment`, `purchase-order`, `freightiq`, `control-tower`, `trade`, `document-center`, `exception-hub`, `mixed-container`, `bulk-container`, `dashboard`, `onboarding`, `notifications`, `system`, `workspace-communication`, vb.

### 6.5 State yönetimi

| Katman | Araç | Dosya | Ne tutar? |
|--------|------|-------|-----------|
| Auth | Zustand + persist | `store/auth.store.ts` | accessToken, user, login/logout/refresh |
| UI | Zustand | `store/ui.store.ts` | Sidebar açık/kapalı vb. |
| Server data | React Query | `lib/queryClient.ts` | API yanıtları, cache, invalidation |
| API client | Axios | `lib/api.ts` | Bearer ekleme, 401’de silent refresh, idempotency |
| Socket | socket.io-client | `lib/socket.ts` | Workspace subscribe, event dinleme |
| Toast | Zustand | `store/toast.store.ts` | Bildirim toast’ları |

### 6.6 API client detayı (`lib/api.ts`)

- Her istekte `Authorization: Bearer {accessToken}` eklenir
- POST/PUT/PATCH/DELETE’te otomatik `Idempotency-Key: {uuid}` header
- `withCredentials: true` — refresh token httpOnly cookie gönderilir
- 401 alındığında: `POST /api/auth/refresh` → yeni access token → orijinal istek tekrarlanır
- Refresh başarısızsa: local logout + `/login?from=...` yönlendirme

### 6.7 Önemli frontend route’ları

**Alıcı (BUYER):**
- `/buyer/dashboard` — Command Center
- `/buyer/rfq`, `/buyer/rfq/new` — RFQ listesi ve oluşturma
- `/buyer/orders`, `/buyer/purchase-orders`, `/buyer/shipments`
- `/buyer/mixed-container/*`, `/buyer/bulk-container/*` — Konteyner modülleri
- `/buyer/freightiq` — FreightIQ embed

**Tedarikçi (SUPPLIER):**
- `/supplier/dashboard`, `/supplier/rfq`, `/supplier/orders`, `/supplier/shipments`

**Admin / Operasyon:**
- `/admin/dashboard`, `/operations`, `/operations/system`
- `/operations/freight`, `/operations/freight-commercial`

**Paylaşılan (tüm roller, participant erişimi):**
- `/workspace/rfq/:id` — RFQ workspace
- `/workspace/order/:id` — Sipariş workspace
- `/workspace/shipment/:id` — Sevkiyat workspace
- `/workspace/trade/:id` — Birleşik Trade Workspace (Sprint 15A)
- `/workspace/trade/:id/documents` — Trade belge paneli
- `/shipments/portfolio` — Sevkiyat portföyü (Sprint 15B)
- `/documents`, `/documents/:id` — Document Center (Sprint 15C)
- `/exceptions`, `/exceptions/:id` — Exception Hub (Sprint 15D)
- `/notifications`, `/learning`

Route tanımları: `apps/frontend/src/routes/index.tsx`

---

## 7. Veritabanı ve Prisma

### 7.1 Schema konumu

`apps/backend/prisma/schema.prisma` — **80+ model**, PostgreSQL.

### 7.2 Temel enum’lar

```prisma
enum Role { BUYER, SUPPLIER, ADMIN }
enum WorkspaceType { RFQ, COMMODITYBID, ORDER, SHIPMENT, MIXED_CONTAINER, BULK_CONTAINER }
enum ParticipantRole { OWNER, COUNTERPARTY, OPERATOR, OBSERVER }
```

### 7.3 Merkezi modeller

#### Workspace (tüm iş süreçlerinin omurgası)

```prisma
model Workspace {
  id            String        @id @default(uuid())
  type          WorkspaceType
  state         String        // FSM state adı (ör. RFQ_SUBMITTED)
  externalRef   String        // Benzersiz referans (RFQ-2024-001)
  spawnedFromId String?       // Parent workspace (RFQ → Order zinciri)
  createdById   String
  currency      String?
  deadlineAt    DateTime?
  // ... ilişkiler
}
```

#### WorkspaceParticipant (erişim kontrolü)

```prisma
model WorkspaceParticipant {
  workspaceId String
  userId      String
  role        ParticipantRole  // OWNER, COUNTERPARTY, OPERATOR, OBSERVER
  joinedAt    DateTime
  leftAt      DateTime?        // null = aktif katılımcı
}
```

#### TimelineEvent (denetim izi)

Her FSM geçişi, belge yükleme, mesaj vb. bir timeline kaydı üretir.

### 7.4 Domain tabloları (özet)

| Domain | Ana modeller |
|--------|--------------|
| Kimlik | `User`, `Organisation`, `RefreshToken`, `PasswordResetToken` |
| RFQ | `RfqDetails`, `RfqLineItem`, `Quotation`, `SupplierAssignment` |
| CommodityBid | `CommodityBidDetails`, `CommodityBidLot`, `CommodityBidSubmission`, `CommodityBidAward` |
| Order | `OrderWorkspace`, `OrderDocument`, `OrderStatusUpdate` |
| Shipment | `ShipmentWorkspace`, `ShipmentTrackingSnapshot`, `ShipmentTrackingEvent` |
| FreightIQ | `FreightRequest`, `FreightOffer`, `FreightSelection`, `FreightRevenueLedger` |
| PO | `PurchaseOrder`, `PurchaseOrderLine`, `PurchaseOrderAmendment` |
| Belgeler | `TradeDocument`, `TradeDocumentVersion`, `DocumentRequirement`, `DocumentReview` |
| Operasyon | `ControlTowerAlert`, `TradeException`, `JobExecution` |
| SmartContainer | `MixedContainerDetails`, `ContainerLine`, `McProcurementQuote`, `McContainerOffer`, `McSupplierAllocation` |
| BulkContainer | `BulkContainerDetails`, `BulkContainerLine`, `BcProcurementQuote`, vb. |
| Katalog | `CatalogCategory`, `CatalogProduct`, `BulkCatalogCategory`, `BulkCatalogProduct` |
| Onboarding | `UserOnboardingProgress` |

### 7.5 İlişki zinciri (trade graph)

```
RFQ Workspace
  └── spawnedFromId ──► Order Workspace
        └── spawnedFromId ──► Shipment Workspace
  └── PurchaseOrder (orderId ile 1:1)
  └── FreightRequest (orderId ile)
  └── TradeDocument (workspaceId + tradeRootId)
  └── ControlTowerAlert (workspaceId)
  └── TradeException (tradeRootId + alertId)
```

**Trade root çözümleme:** `apps/backend/src/modules/trade/trade.resolver.ts`
- `resolveTradeRoot(workspaceId)` — herhangi bir workspace’ten trade kökünü bulur
- `collectTradeGraph(rootId)` — tüm bağlı workspace’leri toplar
- `tradeRefFromRoot(root)` — `TRADE-XXXX` referansı üretir

### 7.6 Migration’lar

`apps/backend/prisma/migrations/` — sprint bazlı:

| Migration | İçerik |
|-----------|--------|
| `20260602124035_init` | Temel şema |
| `sprint3a_commoditybid` | CommodityBid modelleri |
| `sprint3b_order`, `sprint3c_shipment` | Order + Shipment |
| `sprint4a_control_tower` | Control Tower alert’leri |
| `sprint4b_maritime_tracking` | Denizcilik takip |
| `sprint5a_freightiq` … `sprint5e` | FreightIQ, PO, iletişim |
| `sprint12b_mixed_container` | SmartContainer |
| `sprint13b_bulk_container` | BulkContainer |
| `sprint15c_document_center` | Belge versiyonlama |
| `sprint15d_exception_hub` | `trade_exceptions` tablosu |
| `state-guard-trigger.sql` | FSM PostgreSQL trigger’ları |

### 7.7 Seed verisi

`apps/backend/prisma/seed.ts` — geliştirme kullanıcıları:

| E-posta | Rol | Şifre |
|---------|-----|-------|
| `admin@demaxtore.local` | ADMIN | `Passw0rd!` |
| `buyer1@acme.test` | BUYER | `Passw0rd!` |
| `buyer2@beta.test` | BUYER | `Passw0rd!` |
| `supplier1@acme-mfg.test` | SUPPLIER | `Passw0rd!` |

---

## 8. Workspace Modeli ve FSM

### 8.1 FSM nedir?

**Finite State Machine (Sonlu Durum Makinesi):** Her workspace tipinin izin verilen durumları ve geçişleri contracts paketinde tanımlıdır. Örnek RFQ geçişi:

```
RFQ_DRAFT  --[submit]-->  RFQ_SUBMITTED
RFQ_SUBMITTED  --[assign_suppliers]-->  RFQ_ASSIGNED
RFQ_OPEN  --[select_supplier]-->  RFQ_SUPPLIER_SELECTED
...
```

Kaynak: `packages/contracts/src/rfq.fsm.ts` (16 state, 40 transition)

### 8.2 applyTransition() akışı

Her domain servisi aynı deseni kullanır:

```typescript
async applyTransition(actor, workspaceId, action, payload?) {
  // 1. ACL
  await assertCanAccess(actor, workspaceId);

  // 2. Workspace kilitle
  await db.$executeRaw`SET LOCAL app.fsm_authorised = 'true'`;
  const ws = await db.workspace.findUnique({ where: { id }, ... });

  // 3. Geçiş bul
  const transition = findRfqTransition(ws.state, action);
  if (!transition) throw new AppError(400, "INVALID_TRANSITION");

  // 4. Rol + precondition kontrolü
  assertRoleAllowed(actor, transition.allowedRoles);
  await checkPreconditions(ws, transition, payload);

  // 5. State güncelle
  await db.workspace.update({ data: { state: transition.to } });

  // 6. Yan etkiler
  await createTimelineEvent(...);
  await createNotifications(...);
  await writeAuditLog(...);
  socketBus.scheduleEmit(SocketEvents.RFQ_STATE_CHANGED, ...);

  return updatedWorkspace;
}
```

### 8.3 FSM dosyaları (contracts)

| Workspace tipi | FSM dosyası | State sayısı |
|----------------|-------------|-------------|
| RFQ | `rfq.fsm.ts` | 16 |
| CommodityBid | `commoditybid.fsm.ts` | 14 |
| Order | `order.fsm.ts` | 17 |
| Shipment | `shipment.fsm.ts` | 16 |
| MixedContainer | `mixed-container.fsm.ts` | ~15 |
| BulkContainer | `bulk-container.fsm.ts` | ~15 |

### 8.4 Next Actions (UI CTA üretici)

`packages/contracts/src/*.next-actions.ts` — pure fonksiyonlar:

Girdi: workspace state + actor rolü  
Çıktı: Kullanıcıya gösterilecek aksiyon butonları listesi (`{ action, label, variant }`)

Frontend bu listeyi workspace sayfasında render eder; backend hangi geçişlerin geçerli olduğunu tek kaynaktan bilir.

### 8.5 PostgreSQL state-guard trigger

`apps/backend/prisma/migrations/state-guard-trigger.sql`

Veritabanı seviyesinde `workspaces.state` kolonunun contracts dışı bir değere güncellenmesini engeller. Uygulama katmanı `SET LOCAL app.fsm_authorised = 'true'` ile geçici olarak trigger’ı bypass eder — sadece `applyTransition()` içinden.

---

## 9. Kimlik Doğrulama ve Yetkilendirme

### 9.1 JWT akışı

```
Login (email + password)
  └── bcrypt verify
        ├── accessToken (JWT, 15 dk) → Authorization header
        └── refreshToken (random, 7 gün) → httpOnly cookie, DB’de SHA-256 hash

API isteği (accessToken süresi dolmuş)
  └── 401
        └── POST /api/auth/refresh (cookie)
              └── yeni accessToken + cookie rotation
                    └── orijinal istek tekrarlanır
```

**Dosyalar:** `modules/auth/jwt.ts`, `auth.routes.ts`, `auth.controller.ts`, `bruteforce.ts`

### 9.2 Katmanlı yetkilendirme

| Katman | Nerede? | Ne kontrol eder? |
|--------|---------|------------------|
| Route | `requireAuth`, `requireRole` | Giriş yapmış mı? Rol uygun mu? |
| Resource | `*.policy.ts` | Bu kullanıcı bu workspace’e participant mı? |
| FSM | `applyTransition` | Bu rol bu geçişi yapabilir mi? |
| Socket | `canAccessWorkspace()` | Subscribe öncesi workspace erişimi |

### 9.3 Workspace participant rolleri

| Rol | Tipik kullanıcı | Yetki |
|-----|-----------------|-------|
| `OWNER` | Alıcı (buyer) | Tam kontrol, onay/red |
| `COUNTERPARTY` | Tedarikçi | Teklif, üretim güncelleme |
| `OPERATOR` | DeMaxtore admin | Operasyonel müdahale |
| `OBSERVER` | Gözlemci | Salt okunur |

### 9.4 Trade-level ACL (Sprint 15)

`apps/backend/src/modules/trade/trade.policy.ts`:

```typescript
canAccessTrade(db, actor, tradeRootId)
  → ADMIN: her zaman true
  → Diğer: trade graph’taki herhangi bir workspace’te aktif participant mı?
```

Document Center, Exception Hub, Trade Workspace bu policy’yi kullanır.

### 9.5 İzolasyon garantileri

- Buyer A, Buyer B’nin RFQ/sipariş/sevkiyat workspace’ine erişemez (403)
- Supplier sadece atandığı workspace’leri görür
- Socket subscribe denemesi workspace ACL’den geçmezse reddedilir
- E2E: `03-realtime-and-isolation.spec.ts`, `07-hardening.spec.ts`

---

## 10. İş Modülleri (Detaylı)

### 10.1 RFQ (Request for Quotation)

**Amaç:** Alıcının ürün ihtiyacını tanımlayıp tedarikçilerden teklif alması.

**Akış:**
```
Draft → Submit → Admin assign/publish → Suppliers quote
  → Evaluation → Select supplier → Proforma → Issue PO → Spawn Order
```

**API:** `/api/rfq/*`, `/api/admin/rfq/*`  
**Frontend:** `/buyer/rfq`, `/workspace/rfq/:id`  
**Scheduler:** Deadline geçişleri, proforma SLA (`rfq.scheduler.ts`)

**Önemli alt modüller:**
- `quotations` — tedarikçi teklifleri
- `attachments` — RFQ ekleri
- `supplier-activity` — tedarikçi görüntüleme/teklif aktivitesi
- Procurement Strategy — `/workspace/rfq/:id/procurement-strategy`

---

### 10.2 CommodityBid (Ters Müzayede)

**Amaç:** Kapalı teklif (sealed-bid) ters müzayede ile tedarikçi seçimi.

**Akış:**
```
Draft → Publish → Invite suppliers → Auction open → Bids submitted
  → Auction close → Winner determined → Award → Spawn orders
```

**Motor:** `auction-engine.ts`, `winner-engine.ts`, `commoditybid.scheduler.ts`  
**API:** `/api/commoditybid/*`, lot bazlı bid: `POST /:id/lots/:lotId/bids`  
**RFQ bağlantısı:** `POST /api/rfq/:id/spawn-commoditybid`

---

### 10.3 Order (Sipariş)

**Amaç:** Seçilen tedarikçi ile üretim, muayene, navlun ve teslimat yürütme.

**Akış:**
```
Spawned → Production started → Inspection → Freight requested
  → Shipment booked → In transit → Delivered
```

**Spawn kaynakları:** RFQ `issue_po`, CommodityBid `spawn_orders`, SmartContainer/BulkContainer execution bridge  
**API:** `/api/orders/:id/actions/*`  
**Frontend:** `/workspace/order/:id`

---

### 10.4 Purchase Order (PO)

**Amaç:** Resmi satın alma emri yönetimi (onay, değişiklik, iptal).

**Model:** `PurchaseOrder` — `orderId` ile Order workspace’e 1:1 bağlı  
**API:** `/api/purchase-orders/:id/actions/:action`  
**Socket:** `po.issued`, `po.acknowledged`, `po.amendment.*`, `po.closed`  
**Frontend:** `/workspace/po/:id`

---

### 10.5 Shipment (Sevkiyat)

**Amaç:** Konteyner sevkiyatının booking’den teslimata kadar takibi.

**Akış:**
```
Created → Booked → Loaded → In transit → At port → Customs → Delivered
```

**Spawn:** Order `book_shipment` veya FreightIQ offer seçimi  
**Tracking:** Sprint 4B maritime API (`tracking.service.ts`, `tracking.scheduler.ts`)  
**API:** `/api/shipments/*`  
**Frontend:** `/workspace/shipment/:id`

---

### 10.6 FreightIQ (Navlun)

**Amaç:** Navlun talebi, teklif toplama, forwarder seçimi ve gelir optimizasyonu.

**Embed:** Harici FreightIQ paneli SSO ile (`FREIGHTIQ_PANEL_URL`)  
**Native panel:** Order workspace içinde `OrderFreightIqPanel` — teklif seçimi sonrası shipment otomatik spawn + link  
**Köprü (Faz 1–2):** `selectOffer` → `spawnShipmentFromOrder` + `enrichFromFreightOffer` (carrier, POL/POD, ETD/ETA); `proceed_to_freight` mevcut seçimi backfill eder  
**API:** `/api/freightiq/orders/:orderId/actions/:action`  
**Admin:** forwarders, shippers, commercial, analytics  
**Frontend:** `/buyer/freightiq`, `/operations/freight*`

---

### 10.7 Control Tower (Operasyon Merkezi)

**Amaç:** Tüm trade’lerdeki riskleri, SLA ihlallerini ve operasyonel KPI’ları merkezi izleme.

**Alert tarama:** Periyodik scheduler — gecikme, eksik belge, ödeme bekleyen, customs stuck vb.  
**API:** `/api/control-tower/overview`, `/dashboard`, `/alerts`, `/metrics`  
**Frontend:** `/operations` (OperationsPage)  
**Alert key örnekleri:** `TRACKING_DELAY_DETECTED`, `TRADE_DOC_REQUIRED_MISSING`, `PO_NO_ACK_72H`

---

### 10.8 SmartContainer (Mixed Container)

**Amaç:** Birden fazla tedarikçiden ürün toplayıp tek konteynerde birleştirme.

**Akış:**
```
MC_DRAFT → Catalog browse → Builder → Request pricing → Admin offer
  → Allocation → Payment → Execution bridge → Spawn Order → Shipment
```

**API:** `/api/mixed-containers/*`, `/api/admin/mixed-containers/*`  
**Frontend:** `/buyer/mixed-container/*`, admin inbox/procurement/allocations

---

### 10.9 BulkContainer (Dökme Konteyner)

**Amaç:** Tek ürün kategorisinde büyük hacimli konteyner tedariki (müzayede yok).

SmartContainer ile paralel yapı; farklı procurement ve allocation akışı.  
**API:** `/api/bulk-containers/*`, `/api/admin/bulk-container/*`  
**Frontend:** `/buyer/bulk-container/*`

---

### 10.10 Onboarding & Learning Center

**Amaç:** Yeni kullanıcıların platformu öğrenmesi ve ilk trade’ini tamamlaması.

**API:** `/api/onboarding/progress`, milestone tracking  
**Frontend:** `/learning`, `/onboarding` (admin), dashboard onboarding widget’ları  
**Socket:** `onboarding.updated`, `first_trade.completed`

---

### 10.11 Growth Engine & Market Intelligence

**Amaç:** Admin için büyüme hunisi, kayıp fırsatlar, pazar analitiği.

**API:** `/api/growth/*`, `/api/market/*`  
**Frontend:** `/operations/growth`, `/operations/market-intelligence`

---

## 11. Sprint 15 — Birleşik Yürütme Katmanı

Sprint 15, mevcut modülleri **yeni bir alert motoru oluşturmadan** alıcıya yönelik birleşik görünümler sunar.

### 11.1 Trade Workspace (15A)

**Route:** `/workspace/trade/:id`  
**API:** `GET /api/trades/:id/workspace`

Tek ekranda birleştirir:
- Trade özeti (alıcı, üretici, değer, milestone)
- PO listesi, siparişler, FreightIQ, sevkiyatlar
- Belge merkezi tablosu
- Unified timeline
- Control Tower alert’leri
- İstisna paneli (15D)
- İlgili kayıtlar (deep link’ler)

**Resolver:** `trade.resolver.ts` — `collectTradeGraph()`, `resolveTradeRoot()`

---

### 11.2 Shipment Portfolio (15B)

**Route:** `/shipments/portfolio`  
**API:** `GET /api/shipments/portfolio`

- KPI kartları (aktif, gecikmiş, teslim edilen)
- Sevkiyat tablosu (health score, milestone, belge durumu, istisna sayısı)
- Harita görünümü (milestone bazlı)
- Filtreler: status, trade type, carrier, country, search
- Dashboard widget: **My Shipments**

---

### 11.3 Document Center (15C)

**Route:** `/documents`, `/documents/:id`, `/workspace/trade/:id/documents`  
**API:** `GET/POST /api/documents/*`

Kaynakları birleştirir (ikili kopyalamadan):
- `TradeDocument`, `OrderDocument`, `ShipmentDocument`, `RfqAttachment`

Özellikler: upload, download, versioning, approve, reject, request-revision, search, filters, checklist

---

### 11.4 Exception Hub (15D)

**Route:** `/exceptions`, `/exceptions/:id`  
**API:** `GET/POST /api/exceptions/*`

Control Tower alert’lerini `trade_exceptions` projection tablosuna yansıtır:
- Exception tipleri: Shipment Delay, Missing Document, Customs Issue, Carrier Update, Payment Pending, vb.
- `ALERT_TYPE_MAP`: `AlertKey` → `ExceptionType` (RFQ, CommodityBid, Freight, System dahil)
- CT alert `resolvedAt` set edildiğinde bağlı exception otomatik `Closed`
- Sync pass’te `requiredAction` / `ownerRole` yeniden hesaplanır; `PO_REJECTED` → Waiting For Buyer
- Severity: Critical / High / Medium / Low
- Escalation: 24h / 48h / 72h
- Assign, resolve, close
- Dashboard widget: **My Exceptions**

**Önemli:** Yeni alert motoru yok — mevcut `control_tower_alerts` yeniden kullanılır.

---

## 12. Gerçek Zamanlı İletişim (Socket.io)

### 12.1 Sunucu tarafı

**Dosyalar:**
- `apps/backend/src/realtime/socket.ts` — Socket.io init, JWT handshake
- `apps/backend/src/realtime/socket-bus.ts` — Commit sonrası emit kuyruğu

### 12.2 Odalar (rooms)

| Oda | Format | Amaç |
|-----|--------|------|
| Kullanıcı | `user:{userId}` | Kişisel bildirimler |
| Rol | `role:{role}` | ADMIN broadcast |
| Workspace | `workspace:{workspaceId}` | Timeline + state değişiklikleri |

### 12.3 Client → Server

| Event | Açıklama |
|-------|----------|
| `workspace:subscribe` | Workspace odasına katıl (ACL kontrolü) |
| `workspace:unsubscribe` | Odadan ayrıl |

### 12.4 Server → Client (özet)

| Domain | Event örnekleri |
|--------|-----------------|
| Bildirim | `notification:new`, `notification:read` |
| RFQ | `rfq.state.changed`, `rfq.timeline.appended` |
| CommodityBid | `commoditybid.updated`, `commoditybid.bid.submitted` |
| Order | `order.updated`, `order.state.changed` |
| Shipment | `shipment.updated`, `shipment.tracking.updated` |
| Control Tower | `controltower.alert.created`, `controltower.metric.updated` |
| FreightIQ | `freight.offer.submitted`, `freight.commercial.updated` |
| Belgeler | `document.uploaded`, `document.approved` |
| PO | `po.issued`, `po.acknowledged` |
| Sistem | `system.health.updated` |

Tam liste: `packages/contracts/src/socket-events.ts`

### 12.5 Frontend kullanımı

`apps/frontend/src/lib/socket.ts` — singleton client  
Workspace sayfaları subscribe olur → event gelince React Query cache invalidate edilir

---

## 13. Arka Plan İşleri ve Zamanlayıcılar

| İşçi | Dosya | Görev | Aralık |
|------|-------|-------|--------|
| Proforma SLA | `messaging/sla-worker.ts` | PROFORMA_REQUESTED hatırlatma e-postası | 15 dk |
| RFQ Scheduler | `rfq/rfq.scheduler.ts` | Deadline geçişleri, proforma SLA expiry | 15 dk |
| CommodityBid Scheduler | `commoditybid/commoditybid.scheduler.ts` | Davet, auction start/close, winner | 15 dk |
| Control Tower | `control-tower/control-tower.scheduler.ts` | Alert scan + metric broadcast | 15 dk |
| Tracking | `tracking/tracking.scheduler.ts` | Maritime API sync | 1 saat |
| Job Reconciler | `jobs/job-reconciler.ts` | Stale RUNNING → FAILED | Boot + interval |

### Distributed lock

PostgreSQL advisory lock (`apps/backend/src/db/scheduler-lock.ts`) — çoklu instance’da aynı job’ın iki kez çalışmasını engeller.

Lock ID’ler: `PROFORMA_SLA`, `COMMODITYBID`, `CONTROL_TOWER`, `TRACKING`, `RFQ_DEADLINE`

### Job kayıt

`JobExecution` modeli + `executeRecordedJob()` (`modules/jobs/job.runner.ts`)  
Admin görünürlük: `/api/system/jobs`, `/operations/system`

---

## 14. Contracts Paketi

**Konum:** `packages/contracts/`

### İçerik kategorileri

| Kategori | Örnek dosyalar |
|----------|----------------|
| FSM | `rfq.fsm.ts`, `order.fsm.ts`, `shipment.fsm.ts` |
| Next Actions | `rfq.next-actions.ts`, `order.next-actions.ts` |
| Zod şemaları | `rfq.zod.ts`, `document-center` query şemaları |
| Auth | `auth.ts` — Role, LoginInput, ROLE_DASHBOARD |
| Socket | `socket-events.ts` |
| Domain DTO | `trade-workspace.ts`, `document-center.ts`, `exception-hub.ts`, `shipment-portfolio.ts` |
| Learning | `onboarding.ts`, `commoditybid-learning.ts` |

### Import örnekleri

```typescript
// Backend
import { findRfqTransition } from "@dmx/contracts/rfq.fsm";
import { ExceptionHubQuery } from "@dmx/contracts/exception-hub";

// Frontend
import type { TradeWorkspacePayload } from "@dmx/contracts/trade-workspace";
import { ROLE_DASHBOARD } from "@dmx/contracts/auth";
```

Barrel export: `packages/contracts/src/index.ts`

---

## 15. Test Altyapısı

### 15.1 Unit testler

| Paket | Framework | Konum |
|-------|-----------|-------|
| `@dmx/contracts` | Vitest | `packages/contracts/src/*.test.ts` (88 test) |
| `@dmx/backend` | Vitest + Supertest | `apps/backend/src/**/*.test.ts` |

FSM geçişleri, next-actions, hardening (state-guard, workspace-policy, scheduler-lock) unit test ile korunur.

### 15.2 E2E testler (Playwright)

**Konum:** `apps/e2e/tests/` (41 spec dosyası)

| Dosya | Kapsam |
|-------|--------|
| `01-auth.spec.ts` | Login, dashboard yönlendirme |
| `02-rfq-flow.spec.ts` | RFQ tam akış |
| `03-realtime-and-isolation.spec.ts` | Toast + cross-buyer izolasyon |
| `04-commoditybid-flow.spec.ts` | CommodityBid |
| `05-order-flow.spec.ts` | Order FSM |
| `06-shipment-flow.spec.ts` | Shipment |
| `07-hardening.spec.ts` | Rate limit, socket ACL |
| `08-control-tower.spec.ts` | Control Tower |
| `26-trade-workspace.spec.ts` | Trade Workspace |
| `27-shipment-portfolio.spec.ts` | Shipment Portfolio |
| `28-document-center.spec.ts` | Document Center |
| `29-exception-hub.spec.ts` | Exception Hub |
| `30-38-*` | SmartContainer / BulkContainer akışları |

**Helper’lar:** `tests/_helpers.ts` — `uiLogin()`, `apiLogin()`, `setupSubmittedRfq()`, `assignAndPublish()`

**Çalıştırma:**
```bash
cd apps/e2e
E2E_FRONTEND_URL=http://127.0.0.1:3002 yarn test
```

**Not:** Testler serial çalışır (`workers: 1`) — paylaşılan DB. `07-hardening` rate limit testi auth’u geçici olarak kilitleyebilir; ayrı CI job’da çalıştırılmalı.

### 15.3 Kurumsal doğrulama

```bash
yarn validate:enterprise      # Sprint 9 enterprise validation (quick)
yarn validate:hardening       # Sprint 9B hardening (quick)
node tools/platform-readiness/sprint-16-run.mjs  # Sprint 16 readiness
```

---

## 16. Geliştirme ve Deployment

### 16.1 Portlar

| Servis | Port | Not |
|--------|------|-----|
| Frontend (Vite) | **3000** | `vite.config.ts` |
| Frontend (E2E dev) | **3002** | `E2E_FRONTEND_URL` |
| Backend (Express) | **3001** (dev) / **8001** (prod default) | `.env` |
| PostgreSQL | **5432** | |

Vite dev proxy: `/api` ve `/socket.io` → `localhost:3001`

### 16.2 Hızlı başlangıç

```bash
# Bağımlılıklar
yarn install

# Veritabanı
yarn workspace @dmx/backend prisma:generate
yarn workspace @dmx/backend prisma:migrate   # veya prisma:deploy (prod)
yarn workspace @dmx/backend prisma:seed

# Geliştirme (iki terminal)
yarn dev:backend    # http://localhost:3001
yarn dev:frontend   # http://localhost:3000

# Tip kontrolü
yarn typecheck

# Testler
yarn test
yarn workspace @dmx/e2e test
```

### 16.3 Production deployment (özet)

1. `yarn build` — frontend `dist/`, backend TypeScript compile
2. `prisma migrate deploy` — migration’ları uygula
3. PM2 ile backend process: `node apps/backend/dist/server.js`
4. Nginx:
   - `/` → frontend static (`dist/`)
   - `/api` → backend upstream
   - `/socket.io` → WebSocket proxy
5. `GET /api/healthz` — liveness probe

Detay: `docs/sprint-9b-reverse-proxy-readiness-report.md`

---

## 17. Ortam Değişkenleri

### Backend (`apps/backend/.env`)

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token imzalama |
| `JWT_REFRESH_SECRET` | Refresh token |
| `PORT` | Dinleme portu (varsayılan 8001) |
| `CORS_ORIGIN` | İzin verilen frontend origin |
| `STORAGE_DIR` | Lokal dosya yükleme dizini (`STORAGE_PROVIDER=local`) |
| `STORAGE_PROVIDER` | `local` / `s3` |
| `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID` | S3 depolama (production) |
| `EMAIL_PROVIDER` | `console` / `resend` / `smtp` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend production e-posta |
| `TRACKING_PROVIDER` | `manual` / `mock_live` / `maritime_api` |
| `FREIGHTIQ_PANEL_URL` | FreightIQ embed URL |
| `JOB_STALE_RUNNING_MS` | Stale job eşiği |

### Frontend (`apps/frontend/.env`)

| Değişken | Açıklama |
|----------|----------|
| `VITE_API_URL` | API base URL (dev’de `/api` proxy yeterli) |
| `VITE_SOCKET_URL` | Socket.io URL |
| `VITE_APP_NAME` | Uygulama adı |

---

## 18. Dosya ve Klasör Haritası

### Backend modül → dosya

| Alan | Routes | Service | Policy | Contracts |
|------|--------|---------|--------|-----------|
| Auth | `modules/auth/` | ✓ | — | `auth.ts` |
| RFQ | `modules/rfq/` | ✓ | ✓ | `rfq.fsm.ts` |
| CommodityBid | `modules/commoditybid/` | ✓ | ✓ | `commoditybid.fsm.ts` |
| Order | `modules/order/` | ✓ | ✓ | `order.fsm.ts` |
| Shipment | `modules/shipment/` | ✓ | ✓ | `shipment.fsm.ts` |
| FreightIQ | `modules/freightiq/` | ✓ | ✓ | `freightiq.ts` |
| Control Tower | `modules/control-tower/` | ✓ | ADMIN | `control-tower.ts` |
| Trade WS | `modules/trade/` | ✓ | ✓ | `trade-workspace.ts` |
| Doc Center | `modules/document-center/` | ✓ | ✓ | `document-center.ts` |
| Exception Hub | `modules/exception-hub/` | ✓ | ✓ | `exception-hub.ts` |
| Mixed Container | `modules/mixed-container/` | ✓ | ✓ | `mixed-container.fsm.ts` |
| Bulk Container | `modules/bulk-container/` | ✓ | ✓ | `bulk-container.fsm.ts` |
| Jobs/System | `modules/jobs/` | ✓ | ADMIN | `enterprise-readiness.ts` |

### Frontend feature → route

| Feature | Ana sayfa route’u |
|---------|-------------------|
| Dashboard | `/buyer/dashboard`, `/supplier/dashboard`, `/admin/dashboard` |
| RFQ | `/workspace/rfq/:id` |
| Order | `/workspace/order/:id` |
| Shipment | `/workspace/shipment/:id` |
| Trade WS | `/workspace/trade/:id` |
| Shipment Portfolio | `/shipments/portfolio` |
| Document Center | `/documents` |
| Exception Hub | `/exceptions` |
| Mixed Container | `/buyer/mixed-container/*` |
| Bulk Container | `/buyer/bulk-container/*` |
| System Ops | `/operations/system` |

---

## 19. Tipik Bir Ticaretin Yaşam Döngüsü

Aşağıdaki senaryo **Flow A** (klasik RFQ) için uçtan uca akışı gösterir:

```
1. BUYER: RFQ oluşturur (Draft)
   → POST /api/rfq
   → Workspace: type=RFQ, state=RFQ_DRAFT

2. BUYER: RFQ'yu gönderir (Submit)
   → POST /api/rfq/:id/actions/submit
   → state=RFQ_SUBMITTED, timeline event, notification

3. ADMIN: Tedarikçileri atar ve yayınlar
   → POST /api/rfq/:id/actions/assign-suppliers
   → POST /api/rfq/:id/actions/publish
   → state=RFQ_OPEN, supplier'lara bildirim

4. SUPPLIER: Teklif verir
   → POST /api/rfq/:id/quotations
   → Quotation kaydı, buyer'a bildirim

5. BUYER: Tedarikçi seçer, proforma ister
   → POST /api/rfq/:id/actions/select-supplier
   → state=RFQ_SUPPLIER_SELECTED → PROFORMA_REQUESTED

6. SUPPLIER: Proforma yükler
   → Belge yükleme, state=PROFORMA_RECEIVED

7. BUYER: PO çıkarır
   → POST /api/rfq/:id/actions/issue-po
   → PurchaseOrder oluşturulur
   → Order workspace spawn edilir (spawnedFromId=RFQ)

8. ORDER: Üretim → muayene → navlun talebi
   → POST /api/orders/:id/actions/*
   → FreightIQ request oluşturulur

9. FREIGHTIQ: Teklif seçilir → Shipment spawn
   → Shipment workspace oluşturulur
   → Maritime tracking sync başlar

10. SHIPMENT: Transit → customs → delivered
    → Tracking snapshot'lar güncellenir
    → Control Tower alert'leri tetiklenebilir

11. ALICI GÖRÜNÜMLERİ (Sprint 15):
    → /workspace/trade/:id        — tüm trade tek ekranda
    → /shipments/portfolio        — sevkiyat portföyü
    → /documents                  — tüm belgeler
    → /exceptions                 — açık istisnalar ve aksiyonlar

12. OPERASYON:
    → /operations                 — Control Tower
    → Alert'ler Exception Hub'a yansır
    → Admin assign/resolve/close
```

---

## Ek Kaynaklar

| Belge | İçerik |
|-------|--------|
| `docs/system-inventory.md` | 24 modül envanteri (API, ekran, tamamlanma %) |
| `docs/flexport-gap-analysis.md` | Flexport karşılaştırması ve Sprint 15 roadmap |
| `docs/platform-readiness-report.md` | Sprint 16 üretim hazırlık raporu |
| `docs/rfq-state-machine.md` | RFQ FSM detayları |
| `docs/sprint-9b-hardening-report.md` | Altyapı sertleştirme |
| `packages/contracts/src/*.fsm.ts` | Tüm FSM tanımları (kaynak kod) |

---

*Bu rehber, DeMaxtore kod tabanının güncel mimarisini yansıtır. Yeni sprint’ler eklendikçe `docs/system-inventory.md` ve ilgili sprint raporlarıyla birlikte güncellenmelidir.*
