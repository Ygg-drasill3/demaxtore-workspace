# DeMaxtore — Sprint 1 Technical Design Document
**Yazılımcı Teslim Belgesi (Code-Free)**

> Bu belge, kod yazılmadan **önce** netleşmesi gereken 5 başlığı içerir.
> Onaylandıktan **sonra** geliştirici kod üretmeye başlar.
> Detay referansı: `./sprint-1-tdd.md` (kapsamlı sürüm).

**Stack kilidi:** React + Vite + TailwindCSS · Node.js + Express · PostgreSQL + Prisma · JWT + Refresh Token · Socket.io · Ubuntu VPS + PM2 + Nginx.
**Yasaklı:** FastAPI · MongoDB · CRA · Django · Laravel · Firebase · Supabase · Next.js.

---

## 1) Klasör Yapısı

```
demaxtore/                              # pnpm monorepo
├── pnpm-workspace.yaml
├── package.json
│
├── packages/
│   └── contracts/                      # FE ↔ BE paylaşılan zod şemaları + TS tipleri
│       └── src/
│           ├── auth.ts                 # LoginInput, TokenPair, RefreshOutput…
│           ├── user.ts                 # UserDTO, Role enum
│           ├── workspace.ts            # WorkspaceDTO, WorkspaceType, WorkspaceState
│           ├── notification.ts         # NotificationDTO, NotificationType
│           ├── socket.ts               # SocketEventMap (tipli kanallar)
│           └── index.ts
│
├── apps/
│   ├── backend/                        # Express + Prisma + Socket.io
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # → §2
│   │   │   └── seed.ts                 # admin/buyer/supplier seed (idempotent)
│   │   └── src/
│   │       ├── index.ts                # http server + io = new Server()
│   │       ├── app.ts                  # express factory
│   │       ├── env.ts                  # zod ile process.env validation
│   │       ├── db.ts                   # PrismaClient singleton
│   │       ├── logger.ts               # pino
│   │       │
│   │       ├── modules/
│   │       │   ├── auth/               # routes • controller • service • middleware • jwt • password
│   │       │   ├── users/              # /api/users/me
│   │       │   ├── workspaces/         # routing skeleton + policy (participant-based authz)
│   │       │   └── notifications/      # list / mark-read / publish helper
│   │       │
│   │       ├── realtime/
│   │       │   ├── socket.ts           # attachSocket(io)
│   │       │   ├── socket.auth.ts      # JWT handshake middleware
│   │       │   └── socket.rooms.ts     # user:{id} | role:{ROLE} | ws:{id}
│   │       │
│   │       ├── middlewares/            # errorHandler • requestId • rateLimit
│   │       └── utils/                  # asyncHandler • httpErrors (AppError)
│   │
│   └── frontend/                       # Vite + React + Tailwind
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── src/
│           ├── main.tsx                # createRoot + QueryClientProvider
│           ├── App.tsx                 # BrowserRouter + Routes
│           ├── index.css               # tailwind + fonts (Outfit + Inter + JetBrains Mono)
│           │
│           ├── lib/
│           │   ├── api.ts              # axios + refresh interceptor
│           │   ├── socket.ts           # socket.io-client (JWT handshake)
│           │   ├── env.ts              # import.meta.env
│           │   └── cn.ts               # clsx + tailwind-merge
│           │
│           ├── store/
│           │   └── auth.store.ts       # Zustand: user, accessToken, hydrate()
│           │
│           ├── routes/
│           │   ├── ProtectedRoute.tsx  # auth gate
│           │   ├── RoleRoute.tsx       # role gate → /unauthorized
│           │   └── routeMap.ts
│           │
│           ├── components/
│           │   ├── layout/             # AppShell • Sidebar • TopNav • NotificationBell • UserMenu
│           │   ├── common/             # StatusBadge • WidgetCard • EmptyState
│           │   └── ui/                 # primitive bileşenler
│           │
│           └── features/
│               ├── auth/               # LoginPage • ForgotPasswordPage • ResetPasswordPage
│               ├── dashboards/         # BuyerDashboard • SupplierDashboard • AdminDashboard
│               ├── workspaces/         # WorkspacePage (placeholder shell)
│               └── notifications/      # NotificationsPage + useNotifications hook
│
└── ops/
    ├── nginx/demaxtore.conf            # TLS + WebSocket upgrade
    ├── pm2/ecosystem.config.cjs        # demaxtore-api (fork mode)
    └── scripts/
        ├── deploy.sh
        └── postgres-bootstrap.sql
```

**Neden monorepo?** `packages/contracts` sayesinde FE ile BE arasında `WorkspaceType`, `Role`, `NotificationType` gibi enum'lar **derleme zamanında** senkron kalır. Sprint 2'de yeni bir workspace tipi eklendiğinde FE'de derleme hatası alınır — bu, "sessizce bozulan sayfa" sınıfı hataları öldürür.

---

## 2) Prisma Schema (Sprint 1 — minimum modeller)

Tam dosya: **`./sprint-1-prisma-schema.prisma`**. Özet:

### Enumlar (dondurulmuş)
```prisma
enum Role             { BUYER  SUPPLIER  ADMIN }
enum WorkspaceType    { STANDARD_RFQ_WORKSPACE  COMMODITYBID_WORKSPACE  ORDER_WORKSPACE }
enum WorkspaceState   { DRAFT  OPEN  CLOSED  ARCHIVED }
enum NotificationType { INFO  SUCCESS  WARNING  ERROR }
enum ParticipantRole  { OWNER  COUNTERPARTY  OPERATOR  OBSERVER }
```

### Tablolar
| Tablo | Sprint 1'de neden gerekli |
|---|---|
| `users` | Auth subject + RBAC |
| `refresh_tokens` | Sunucu-tarafı refresh rotation + revocation list (token *hash*'i saklanır) |
| `password_reset_tokens` | Forgot/reset password akışı |
| `login_attempts` | Brute-force throttling |
| `workspaces` | `/workspace/:type/:id` rotası için iskelet satırı (iş alanları YOK) |
| `workspace_participants` | Workspace-scoped authz + Socket.io room üyeliği |
| `timeline_events` | Append-only event log. Sprint 1'de yalnızca `"workspace.created"` event seed'lenir |
| `notifications` | Per-user veya role-broadcast (INFO/SUCCESS/WARNING/ERROR) |

### Sprint 1'de **kasten** olmayan tablolar
RFQ details · CommodityBid lots · Quotations · Proformas · Purchase Orders · FreightIQ rates · Inspection reports · Shipments · Documents · Exceptions.
Her biri kendi sprint'inde `workspaces` ile **1:1 satellite tablo** olarak eklenecek (geriye dönük FK eklenmez).

### Komutlar
```bash
cd apps/backend
pnpm prisma migrate dev --name sprint1_foundation
pnpm prisma db seed
```

---

## 3) Route Yapısı

### 3.1 Backend — REST endpoint kataloğu (`/api` prefix'i Nginx'te değil app'te eklenir)

| Method | Path                              | Guard                | Açıklama |
|--------|-----------------------------------|----------------------|----------|
| GET    | `/api/health`                     | —                    | health probe |
| POST   | `/api/auth/login`                 | —                    | body: `{email, password}` → `{accessToken, user}` + refresh cookie |
| POST   | `/api/auth/refresh`               | cookie               | yeni access; refresh **rotate** edilir |
| POST   | `/api/auth/logout`                | Bearer               | refresh chain revoke + cookie sil |
| GET    | `/api/auth/me`                    | Bearer               | mevcut kullanıcı |
| POST   | `/api/auth/forgot-password`       | —                    | her zaman 200 (enumeration koruması) |
| POST   | `/api/auth/reset-password`        | —                    | `{token, newPassword}` |
| GET    | `/api/users/me`                   | Bearer               | UserDTO |
| GET    | `/api/workspaces?mine=true`       | Bearer               | kullanıcının participant olduğu workspace'ler |
| POST   | `/api/workspaces`                 | Bearer (ADMIN)       | `{type}` → iskelet workspace yarat (Sprint 1 demo) |
| GET    | `/api/workspaces/:id`             | Bearer + policy      | participant veya ADMIN → workspace + timeline + participants |
| GET    | `/api/notifications`              | Bearer               | kullanıcının kendi + role-broadcast bildirimleri |
| POST   | `/api/notifications/:id/read`     | Bearer               | tek bildirimi okundu işaretle |
| POST   | `/api/notifications/read-all`     | Bearer               | hepsini okundu işaretle |

**Hata formatı (standart):**
```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "...", "details": {} } }
```

### 3.2 Backend — Socket.io kanal kataloğu (Sprint 1: yalnızca "hazırlık")

| Room               | Üyeler                                  | Sprint 1'de emit edilen olay(lar) |
|--------------------|----------------------------------------|-----------------------------------|
| `user:{userId}`    | yalnızca o kullanıcının soketleri       | `notification:new`                |
| `role:{ROLE}`      | o role sahip tüm bağlı kullanıcılar     | `notification:new` (broadcast)    |
| `ws:{workspaceId}` | workspace participants                  | rezerv — Sprint 2'den itibaren     |

Handshake: client `auth: { token: accessToken }` ile bağlanır; `socket.auth.ts` JWT doğrular → `socket.data.user = { id, role }`.

### 3.3 Frontend — Route haritası (`routeMap.ts`)

| Path                          | Component                | Guard                  |
|-------------------------------|--------------------------|------------------------|
| `/login`                      | `LoginPage`              | public                 |
| `/forgot-password`            | `ForgotPasswordPage`     | public                 |
| `/reset-password`             | `ResetPasswordPage`      | public                 |
| `/unauthorized`               | `UnauthorizedPage`       | public                 |
| `/`                           | redirect → role dashboard| `ProtectedRoute`       |
| `/buyer/dashboard`            | `BuyerDashboard`         | role = BUYER           |
| `/buyer/*`                    | `PlaceholderPage`        | role = BUYER           |
| `/supplier/dashboard`         | `SupplierDashboard`      | role = SUPPLIER        |
| `/supplier/*`                 | `PlaceholderPage`        | role = SUPPLIER        |
| `/admin/dashboard`            | `AdminDashboard`         | role = ADMIN           |
| `/admin/*`                    | `PlaceholderPage`        | role = ADMIN           |
| `/notifications`              | `NotificationsPage`      | auth                   |
| `/workspace/:type/:id`        | `WorkspacePage`          | auth + participant policy |
| `*`                           | redirect → `/`           | —                      |

### 3.4 RBAC Matrisi (Sprint 1)

| Endpoint / Sayfa                  | BUYER | SUPPLIER | ADMIN |
|-----------------------------------|:-----:|:--------:|:-----:|
| `/api/auth/*`                     |   ✓   |    ✓     |   ✓   |
| `GET /api/users/me`               |   ✓   |    ✓     |   ✓   |
| `GET /api/workspaces?mine=true`   |   ✓   |    ✓     |   ✓   |
| `GET /api/workspaces/:id`         | own*  |   own*   |   ✓   |
| `POST /api/workspaces`            |   ✗   |    ✗     |   ✓   |
| `GET /api/notifications`          |   ✓   |    ✓     |   ✓   |
| `/buyer/*`                        |   ✓   |    ✗     |   ✗   |
| `/supplier/*`                     |   ✗   |    ✓     |   ✗   |
| `/admin/*`                        |   ✗   |    ✗     |   ✓   |
| `/workspace/:type/:id`            | own*  |   own*   |   ✓   |

`own*` = kullanıcı o workspace'in `workspace_participants` kaydında olmalı.

---

## 4) Auth Akışı

### 4.1 Token modeli
- **Access token** — JWT (`JWT_ACCESS_SECRET`), claims `{ sub, role, type:"access", exp:+60m }`. FE → `Authorization: Bearer <token>`.
- **Refresh token** — JWT (`JWT_REFRESH_SECRET`), claims `{ sub, type:"refresh", jti, exp:+7d }`. **httpOnly cookie**, path `/api/auth`, `SameSite=Lax` (cross-origin durumunda `None; Secure`).
- Refresh token'ın **plain** hâli DB'de tutulmaz; yalnızca `sha256(token)` `refresh_tokens.token_hash` kolonunda saklanır.

### 4.2 Login sekansı
```
FE → BE   POST /api/auth/login { email, password }
BE        login_attempts (5 hata / 15 dk lock)
BE        users.findUnique({email})  → bcrypt.compare
BE        Insert refresh_tokens row (tokenHash, ua, ip, expiresAt)
BE → FE   200 { accessToken, user }   + Set-Cookie: refresh_token=...; HttpOnly
FE        Zustand: setUser + setAccessToken
FE        socket.connect({ auth: { token: accessToken } })
```

### 4.3 Refresh rotation sekansı
```
FE → BE   POST /api/auth/refresh         (cookie ile)
BE        verify(JWT, refreshSecret)
BE        find refresh_tokens by tokenHash
            ├─ yok / revokedAt set → 401  (chain'i tamamen revoke et — token theft varsayımı)
            ├─ expiresAt geçmiş     → 401
            └─ valid → devam et
BE        UPDATE current row { revokedAt=now, replacedBy=newId }
BE        INSERT new refresh row
BE → FE   200 { accessToken }            + Set-Cookie: refresh_token=NEW; HttpOnly
FE (axios interceptor)
          orijinal 401 olan isteği YENİ token ile bir kez retry
          (rotation yarış koşulu için: tek bir `refreshing` Promise paylaşılır)
```

### 4.4 Forgot / Reset sekansı
```
POST /api/auth/forgot-password { email }
  → her zaman 200 { ok:true }           (enumeration koruması)
  → kullanıcı varsa: token üret, sha256 hash'ini password_reset_tokens'a yaz, expiresAt=+1h
  → out-of-band: e-posta gönderimi Sprint 2 (provider'lı)

POST /api/auth/reset-password { token, newPassword }
  → token_hash bul; usedAt=NULL ve expiresAt>now olmalı
  → bcrypt.hash(newPassword) → users.password_hash güncelle
  → password_reset_tokens.usedAt = now
  → tüm refresh_tokens'ları revoke et (zorunlu re-login)
```

### 4.5 Logout
```
POST /api/auth/logout  (Bearer)
  → mevcut refresh cookie'sini bul → revokedAt=now
  → Set-Cookie: refresh_token=; Max-Age=0
```

### 4.6 `requireAuth` + `requireRole` middleware kontratı
- `requireAuth`: `Authorization: Bearer <access>` yoksa veya doğrulanmazsa → 401 `UNAUTHENTICATED`. Başarılıysa `req.user = { id, role }`.
- `requireRole(...roles)`: `req.user.role` listede değilse → 403 `FORBIDDEN`.
- Workspace-scoped erişim için `workspaces.policy.ts::canAccessWorkspace(user, workspaceId)`:
  - `ADMIN` → her zaman izin.
  - aksi hâlde `workspace_participants.findFirst({workspaceId, userId})` zorunlu.

### 4.7 Güvenlik kararları
| Karar                                | Sebep |
|--------------------------------------|-------|
| Refresh cookie httpOnly + SameSite   | XSS'te token çalınamaz; CSRF için path `/api/auth` + SameSite yeterli |
| Refresh rotation + replay detection  | Çalınmış refresh kullanıldığında chain revoke → otomatik kilitleme |
| Access token kısa (60dk)             | Sızdığında ömrü kısıtlı |
| `password_hash` = bcrypt cost 12     | OWASP güncel önerisi |
| `login_attempts` rate limit          | Credential stuffing'i yavaşlatır |
| Forgot her zaman 200                 | E-mail enumeration koruması |

---

## 5) Dashboard Mimarisi

### 5.1 Ortak app shell
```
<AppShell>
  <Sidebar />                 # sol, fixed 256px, role-aware menü
  <TopNav>                    # sticky 64px
    <Search />                # global ⌘K (Sprint 2'de aktif)
    <NotificationBell />      # badge = unread count, socket-driven
    <UserMenu />              # avatar + sign out
  </TopNav>
  <main>{children}</main>     # ml-64, p-8, bg-#FAFAFA
</AppShell>
```

### 5.2 Sidebar — role'e göre menüler
| BUYER                  | SUPPLIER                    | ADMIN                   |
|------------------------|-----------------------------|-------------------------|
| Dashboard              | Dashboard                   | Dashboard               |
| RFQ Workspaces         | Assigned RFQs               | RFQs                    |
| CommodityBid           | CommodityBid Invites        | CommodityBids           |
| Orders                 | Orders                      | Orders                  |
| Documents              | Documents                   | Suppliers               |
| Notifications          | Notifications               | Documents               |
|                        |                             | Notifications           |
|                        |                             | Settings                |

Sprint 1'de **Dashboard / Notifications / Workspace** dışındaki linkler `PlaceholderPage` rotasına gider.

### 5.3 Dashboard widget gridi
Üç dashboard da aynı `<WidgetCard label value delta icon />` bileşenini kullanır. **Sprint 1'de değerler mock** — Sprint 2'de gerçek endpoint'e bağlanır.

| Widget                  | BUYER | SUPPLIER | ADMIN |
|-------------------------|:-----:|:--------:|:-----:|
| Active RFQs             |   ✓   |          |       |
| Pending Quotations      |   ✓   |    ✓     |       |
| Active Orders           |   ✓   |    ✓     |       |
| Documents               |   ✓   |          |       |
| Assigned RFQs           |       |    ✓     |       |
| New RFQs                |       |          |   ✓   |
| Supplier Assignments    |       |          |   ✓   |
| Open Workspaces         |       |          |   ✓   |
| Recent Activity (list)  |   ✓   |    ✓     |   ✓   |

### 5.4 Workspace placeholder sayfası (`/workspace/:type/:id`)
4 bölümlü canonical shell:
```
┌────────────────────────────────────────────────────────────┐
│ Workspace header: type · externalRef · state badge · next  │
├──────────────────────────────────┬─────────────────────────┤
│                                  │                         │
│ Timeline (append-only events)    │  Next Actions           │
│   (Sprint 2'de state machine     │   (state machine        │
│    transition'larından beslenir) │    descriptor'undan)    │
│                                  │                         │
├──────────────────────────────────┼─────────────────────────┤
│                                  │                         │
│ Documents (versioned + signing)  │  Participants           │
│   (Sprint 2)                     │   (workspace_participants)│
│                                  │                         │
└──────────────────────────────────┴─────────────────────────┘
```
Sprint 1'de her bölüm boş "placeholder" gösterir; gerçek veri Sprint 2+'da gelir.

### 5.5 Data flow
- **Sunucu state'i** → TanStack Query (`["notifications"]`, `["workspaces","mine"]`, `["workspace", id]`).
- **UI/auth state'i** → Zustand (`auth.store`).
- **Realtime patch'leri** → `socket.on("notification:new", n => queryClient.setQueryData(...))` ile cache'e merge.

### 5.6 Tasarım dili (Premium SaaS)
| Token        | Değer                        |
|--------------|------------------------------|
| Background   | `#FAFAFA`                    |
| Surface      | `#FFFFFF`                    |
| Border       | `zinc-200`                   |
| Primary      | `zinc-950`                   |
| Accent       | `blue-600`                   |
| Status BG    | INFO `blue-50` · SUCCESS `emerald-50` · WARNING `amber-50` · ERROR `red-50` |
| Radius       | `1rem` (rounded-2xl kartlar) |
| Shadow       | soft: `0 1px 2px / 0 8px 24px -12px` |
| Display font | **Outfit**                   |
| Body font    | **Inter**                    |
| Mono font    | **JetBrains Mono**           |

Yasak: marketplace estetiği, mor/violet gradyanlar, banner kalabalığı, Alibaba/directory görünümü.

---

## Kabul Kriterleri (Sprint 1 Definition of Done)
Geliştirici, aşağıdaki **10 maddenin tamamı yeşil** olduğunda Sprint 1'i tamamlanmış sayar:

1. `pnpm install && pnpm -r build` hatasız.
2. `prisma migrate deploy` temiz bir Postgres 16 DB'sine sorunsuz uygulanır.
3. Seed edilmiş buyer/supplier/admin hesapları login olur (access döner, refresh cookie set edilir).
4. Cross-role gezinme (örn. buyer → `/admin/dashboard`) `/unauthorized`'a yönlendirir.
5. Refresh rotation çalışır; eski refresh token'ın yeniden kullanımı → 401 + chain revoke.
6. `/workspace/:type/:id` Timeline / Documents / Next Actions / Participants bölümleriyle render olur.
7. Socket.io handshake — geçerli JWT ile başarılı; JWT'siz handshake reddedilir.
8. `notifications.service.publish()` çağrısı, hedef kullanıcının bell + sayfasında **real-time** belirir.
9. `nginx -t` geçer; PM2 `demaxtore-api`'yi başlatır ve `pm2 restart` sonrası ayakta kalır.
10. Playwright smoke testi geçer: login → dashboard → bell → workspace → logout.

---

## Kapsam Dışı (Sprint 1'de **yapılmayacak**)
RFQ creation · CommodityBid workflow · Quotation management · Proforma · PO Management · FreightIQ · Inspection · Shipment Visibility · Exception Management · Real email delivery.
Bu modüllerin yokluğu Sprint 1 defekti **değildir**.

---

## Yazılımcıya talimat (kopyala-yapıştır prompt)

> Bu Sprint 1 TDD onaylanmıştır. Aşağıdaki sırayla ilerle ve **her adım sonunda durup onay bekle**:
> 1. Monorepo iskeleti (§1) + `packages/contracts` zod şemaları.
> 2. Prisma schema (`./sprint-1-prisma-schema.prisma`) + migration + seed.
> 3. Express app composition + auth modülü (§3.1, §4) + Vitest birim testleri.
> 4. Socket.io gateway iskeleti (§3.2) — sadece handshake + `notification:new` emit.
> 5. Vite + React iskeleti + AppShell + Sidebar + TopNav + NotificationBell (§5).
> 6. Login / Forgot / Reset sayfaları + axios refresh interceptor (§4.3).
> 7. Buyer / Supplier / Admin dashboard'ları + workspace placeholder (§5.4).
> 8. Playwright smoke + DoD §1–§10 doğrulaması.
>
> Stack dışına çıkma. CRA, FastAPI, Mongo, Next.js, Firebase **yasak**.
> Her adımda komutları, dosya yollarını ve testleri raporla.
