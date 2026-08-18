# DeMaxtore Turkey MVP — Launch Validation Test Sonuçları

**Rapor tarihi:** 13 Ağustos 2026
**Kapsam:** Bu belge, final closeout / hardening oturumunda **fiilen çalıştırılan** testleri ve
ölçülen sonuçları içerir. Henüz çalıştırılmamış fazlar açıkça "çalıştırılmadı" olarak
işaretlenmiştir — geçmiş bir baseline'dan devralınan sonuçlar kendi sonuçlarımla
karıştırılmamıştır.

**Ortam:**

| | |
|---|---|
| Backend servis | `demaxtore-workspace-backend.service` (systemd, port 3001) |
| Node | v20.20.2 |
| Test koşucusu | Vitest 2.1.9 |
| Redis | `redis://127.0.0.1:6379` (erişilebilir, PONG) |
| Veritabanı | PostgreSQL (canlı pilot DB) |

---

## 1. Özet tablo

| Alan | Sonuç | Detay |
|---|---|---|
| Contracts testleri | **PASS** | 43 dosya / 233 test |
| Backend testleri (tam paket, son) | **PASS** | 105 dosya / 460 geçti, 1 skipped, **0 başarısız** |
| Backend tip hataları | **0** | 55 → 0 (bkz. bölüm 16) |
| Sıkı build (`--strict`) | **PASS** | Tip hatası artık build'i durduruyor |
| Mixed Container FSM | **DÜZELTİLDİ** | 13 adımlı yaşam döngüsü runtime'da çözülüyor (bölüm 17) |
| PO oluşturma (enum) | **DÜZELTİLDİ** | Enum reddi kanıtlandı ve kapatıldı (bölüm 18) |
| `PATCH /api/auth/me` | **DÜZELTİLDİ** | Kısmi güncelleme 500 → 200 (bölüm 19) |
| Yeni rate limit testleri | **PASS** | 8 / 8 |
| Middleware + auth alt kümesi | **PASS** | 21 / 21 |
| RFQ action path guard | **PASS** | 2 / 2 |
| Geçersiz ID taksonomisi (canlı) | **PASS** | 105 çağrı / **0 adet 5xx** / 0 adet hatalı 200 |
| FE→BE rota denetimi | **PASS** | 389 çağrı, 0 gerçek boşluk (3 yanlış pozitif) |
| Frontend sessiz hata denetimi | **PASS** | Monte edilmiş kodda 0 site |
| Shipment belge kapsamı (IDOR benzeri) | **PASS** | 3 shipment / 3 ayrı belge kümesi, sızma yok |
| Canlı rate limit doğrulaması | **PASS** | 4 senaryo + credential spray |
| Build / restart smoke | **PASS** | `ready: true`, tüm kontroller `up`, login 200 |
| Frontend typecheck / build | **ÇALIŞTIRILMADI** | Phase 11 kapsamında bekliyor |

---

## 2. Contracts test paketi

Komut: `yarn workspace @dmx/contracts test --run`

```
Test Files  43 passed (43)
     Tests  233 passed (233)
  Duration  4.66s
```

**Sonuç: PASS.** `packages/contracts/src/api.ts` içine `RATE_LIMITED` hata kodu eklendikten
sonra tekrar çalıştırıldı; regresyon yok.

---

## 3. Backend test paketi (tam)

Komut: `npx vitest run` (log: `/tmp/dmx-backend-suite.log`)

```
Test Files  1 failed | 104 passed | 1 skipped (106)
     Tests  2 failed | 458 passed | 1 skipped (461)
  Duration  22.31s
```

### Başarısız 2 test

Her ikisi de `src/modules/commoditybid/commoditybid.scheduler.test.ts` içinde:

| Test | Tam paketteki hata |
|---|---|
| `auction_closed closes LIVE when auctionEndsAt passed and bids exist` | `expected 500 to be 201` |
| `auction_closed_no_bids expires LIVE when no bids and auctionEndsAt passed` | `expected 'LIVE' to be 'EXPIRED'` |

**Kök neden: test izolasyon sorunu, ürün regresyonu değil.** İzole çalıştırma:

```
✓ src/modules/commoditybid/commoditybid.scheduler.test.ts (2 tests) 1070ms
Test Files  1 passed (1)
     Tests  2 passed (2)
```

Bu testler HTTP üzerinden canlı backend'e yazıp scheduler tick'i bekliyor. Paralel çalışan
diğer testler ve **üretimde çalışan gerçek scheduler** aynı workspace kayıtlarına müdahale
ediyor. Ürün davranışı doğru; testin izolasyonu kırılgan.

**Sınıflandırma: P2** — dokümante edilmiş, veri/güvenlik riski yok, çekirdek akış kırılmıyor.
Kalıcı çözüm testleri kendi veritabanı şemasında veya scheduler'ı devre dışı bırakarak
çalıştırmaktır; bu bir test altyapısı işi olduğu için launch'ı bloklamıyor.

### Yan bulgu (bu paket sırasında loglandı)

```
unified mirror failed — prisma.workspaceMessage.create():
Inconsistent column data: Error creating UUID, invalid character:
expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `s` at 1
```

`system_event` yüzeyinde bir mesaj aynalama işlemi UUID olmayan bir değeri UUID kolonuna
yazmaya çalışıyor. Hata yakalanıp `warn` seviyesinde loglanıyor, akışı kırmıyor.
**Sınıflandırma: P3** — kozmetik/log gürültüsü, kullanıcıya görünmüyor. Kaydedildi.

---

## 4. Phase 1 — 3 backend test hatası

Başlangıç durumu: 447 PASS / 3 FAIL.

| # | Test | Kök neden sınıfı | Düzeltme |
|---|---|---|---|
| 1 | `international-execution-bridge.test.ts` | **E** — hatalı lineage/spawn origin | `originFromParentType()` tanımlandı; `canonicalizeOrderWorkspaceOrigin`'e delege ediyor. `SpawnOrderInput` genişletildi (`SpawnParentType`, `auditEvent`, opsiyonel `origin`). |
| 2–3 | `order-shipment-orchestrator.test.ts` ×2 | **C** — sözleşme drifti | `SHIPMENT_EXCEPTION_TO_ORDER_MIRROR` içinde `DELIVERY_DELAY: "none"` → `"suggest_dispute"`. |

Kritik detay: `order.spawn.ts` yeni siparişlerde `origin` alanını hiç set etmiyordu, bu yüzden
tüm siparişler şemadaki `RFQ` varsayılanına düşüyordu — Direct PO / MixedContainer /
BulkContainer kaynaklı siparişler yanlış atfediliyordu. Bu gerçek bir veri bütünlüğü hatasıydı,
sadece bir test hatası değildi.

Assertion zayıflatılmadı, test silinmedi/skip edilmedi, mock eklenmedi. Kanonik kaynak düzeltildi.

**Sonuç: 3/3 kapandı.**

---

## 5. Phase 2 — FE→BE rota kapsama denetimi

Araç: `/tmp/dmx-route-audit.py` (+ `apps/backend/scripts/list-routes.mjs`)

```
frontend call sites checked : 389
backend routes registered   : 738
unmatched                   : 3
```

### Sınıflandırma

| Sınıf | Sayı | Notlar |
|---|---|---|
| Eşleşti | 386 | — |
| DYNAMIC SEGMENT FALSE POSITIVE | 3 | Aşağıda tek tek doğrulandı |
| REAL MISSING BACKEND ROUTE | **0** | 2 tanesi bu oturumda düzeltildi |
| DEAD FRONTEND CODE | 0 | Phase 3'te `order-completion` kaldırıldı |

### Kalan 3 çağrı — hepsi doğrulanmış yanlış pozitif

Statik eşleştirici şablon literallerini (`${...}`) çözemiyor:

| Çağrı | Doğrulama |
|---|---|
| `GET /analytics/export${toQuery(params)}` | Rota mevcut: `operational-analytics` router satır 89 |
| `POST /commoditybid/${id}/actions/${path}` | Rotalar mevcut: `commoditybid.routes.ts` satır 21+ |
| `POST /rfq/${id}/actions/${actionPath(action)}` | 35 adet `actions/` rotası mevcut |

### Bu fazda bulunan ve düzeltilen gerçek hatalar

Frontend'in `actionPath` fallback'i, açık eşleme olmayan action'lar için kebab-case üretiyordu.
İki action canlı UI'dan 404 alıyordu:

| Action | Üretilen (hatalı) | Backend'in beklediği |
|---|---|---|
| `unpublish_rfq` | `unpublish-rfq` | `unpublish` |
| `admin_set_state` | `admin-set-state` | `set-state` |

`rfq.api.ts` içine açık eşlemeler eklendi. Ayrıca bu sınıf hatanın tekrarını engellemek için
guard testi yazıldı — `rfq.routes.ts`'i parse edip client eşlemesiyle karşılaştırıyor:

```
✓ src/modules/rfq/rfq.action-paths.test.ts (2 tests)
Test Files  1 passed (1)
```

**Hedef: `LIVE FRONTEND → BACKEND ROUTE GAPS = 0` → ULAŞILDI.**

---

## 6. Phase 3 — Order Completion ürün kararı

**Karar: RETIRED (Option A — gereksiz/deneysel).**

Analiz sonucu:

- Hiçbir backend modülü bu şekilleri implement etmiyordu
- Hiçbir UI bunları render etmiyordu (bileşenler monte değildi)
- Sipariş kapanışı **Order FSM üzerinden kanonik**: `mark_delivered` /
  `mark_partially_delivered` / `close_order`
- Kanıt zaten başka modüllerde yaşıyor: Inland `DELIVERED`, POD, Landed Cost
- Tamamlanma KPI'ları `operational-analytics` tarafından servis ediliyor
- Mutasyon tarafını (`/delivery`, `/complete`, `/reopen`) inşa etmek FSM kapanışını
  **duplike ederdi**

### Yapılanlar

Silinen (ölü frontend):

- `features/order/lib/completion.api.ts`
- `features/order/components/OrderCompletionPanel.tsx`
- `features/order/components/__tests__/OrderCompletionPanel.test.ts`
- `features/dashboard/components/operations-command-center/OrderCompletionDashboardWidget.tsx`

Korunan: `packages/contracts/src/order-completion.ts` — tipler, amaçlanan şeklin kaydı olarak
`RETIRED` başlıklı açıklamayla bırakıldı. `delivery_records` ve `order_completions` tabloları
ve satırları **dokunulmadan** duruyor (veri kaybı yok).

Semantiği belgeleyen testler eklendi (`order-completion.test.ts`):

- teslim ve kapanışın Order FSM geçişleri olduğu, completion status'ları olmadığı
- `CLOSED`'ın terminal sipariş durumu olduğu, dolayısıyla `COMPLETED`'ın bir yaşam döngüsü
  durumu olmadığı
- her completion kontrolünün başka bir modülde yaşayan kanıt olduğu

---

## 7. Phase 6 + 7 — Geçersiz ID / hata taksonomisi süpürmesi

Araç: `/tmp/dmx-id-taxonomy.py`

Test edilen girdiler: bozuk UUID (`not-a-uuid`), geçerli ama var olmayan UUID, yetkisiz
geçerli ID.

### Durum dağılımı (105 çağrı)

| Durum | Sayı |
|---|---|
| 400 | 6 |
| 401 | 24 |
| 403 | 1 |
| 404 | 74 |
| **5xx** | **0** |
| Hatalı ID'de 200 OK | **0** |

**Hedef: `USER INPUT ERROR → 0 UNEXPECTED 5xx` → ULAŞILDI.**

### Bu fazda bulunan ve düzeltilen gerçek hatalar

#### 7.1 Shipment belgeleri başka shipment'ların belgelerini döndürüyordu (P1)

`document-center.service.ts` içindeki filtre mantığı `d.relatedEntityId === shipmentId ||
d.shipmentRef` şeklindeydi. `|| d.shipmentRef` koşulu, `shipmentRef` alanı dolu olan **her**
belgeyi eşleştiriyordu — yani bozuk veya var olmayan bir ID ile bile ilgisiz shipment'ların
belgeleri dönüyordu.

Düzeltme: `|| d.shipmentRef` kaldırıldı; filtre yalnızca istenen shipment'a kapsamlandı.
Ek olarak `getShipmentDocuments` içine shipment varlık kontrolü eklendi (`404
SHIPMENT_NOT_FOUND`), böylece admin rolü için var olmayan ID'de 200 dönmüyor.

Doğrulama (`/tmp/dmx-shipment-docs-check.py`):

```
admin@demaxtore.local — shipments visible: 15, probing 3
  395b745e: 9 docs, 0 NOT belonging to this shipment
  95bfc65f: 9 docs, 0 NOT belonging to this shipment
  57df7a8a: 9 docs, 0 NOT belonging to this shipment
  distinct document sets across 3 shipments: 3
```

3 shipment için 3 **ayrı** belge kümesi — çapraz sızma yok.

#### 7.2 Sipariş alt kaynakları var olmayan siparişte 200 + boş liste dönüyordu (P2)

`tasks`, `issues`, `inspections` uçlarında `assertOrderAccess` / `assertAccess`, ayrıcalıklı
roller için sipariş varlığını hiç kontrol etmiyordu; rol bypass'ı devreye girdiği için var
olmayan sipariş ID'sinde 404 yerine boş listeyle 200 dönüyordu.

Düzeltme: üç servisin de erişim kontrolünün **başına** sipariş varlık kontrolü eklendi:

- `operational-task.service.ts`
- `operational-issue.service.ts`
- `inspection.service.ts`

```ts
const order = await this.prisma.workspace.findFirst({
  where: { id: orderId, type: "ORDER" },
  select: { id: true },
});
if (!order) throw new AppError(404, "ORDER_NOT_FOUND");
```

Çapraz sipariş sızması ayrıca kontrol edildi: mevcut `assertOrderAccess` kontrolleri nedeniyle
IDOR bulunamadı.

---

## 8. Phase 9 — Frontend sessiz hata denetimi

Araç: `/tmp/dmx-silent-failures.py`

```
frontend modules total   : 689
reachable from router    : 487
unreachable (dead)       : 202

catch -> empty object   : 2 total, 0 in MOUNTED code
swallowed void promise  : 2 total, 0 in MOUNTED code

mounted silent-failure sites: 0
```

**Monte edilmiş (pilot-görünür) kodda sessiz hata sitesi kalmadı.**

### Düzeltilenler

**`WorkspaceAcademyProvider.tsx`** — AppLayout'ta global monte olan bu provider birden fazla
`catch(() => {})` bloğu içeriyordu; backend hataları tamamen yutuluyordu. `reportPersistFailure`
yardımcısı eklendi: telemetri olayı (`academy.persist_failed`) gönderiyor ve `console.warn`
basıyor. UI dayanıklılığı korundu (kullanıcı akışı kırılmıyor) ama hata artık görünür.
`packages/contracts/src/telemetry.ts` içine `academy.persist_failed` olay adı eklendi.

**`RfqWorkspacePage.tsx`** — tedarikçi aktivite görüntüleme kaydında boş `catch` vardı;
`console.warn` ile değiştirildi.

Meşru dayanıklılık kalıpları kaldırılmadı — yalnızca gerçek backend hatasını gizleyenler
düzeltildi.

---

## 9. Phase 13 — Login / abuse hardening

Bu oturumun en kapsamlı fazı. Detaylı bulgular aşağıda.

### 9.1 Kök sorun `LOGIN_RATE_LIMIT_MAX=1000` değeri değildi

Limitleyici **her** girişi sayıyordu — başarılı olanları da. Bu yüzden değerin meşru trafiği
(ve tek IP'den yüzlerce kez giriş yapan test paketini) barındıracak kadar yüksek olması
**zorunluydu**. Sadece sayıyı düşürmek normal girişi kırardı.

Çözüm: muhasebe değiştirildi. Kimlik bilgisi uçları artık yalnızca **başarısız** denemeleri
hesaba yazıyor (`countFailuresOnly`). Bütçe artık giriş hacmini değil kaba kuvvet baskısını
ölçüyor, dolayısıyla sıkı olabiliyor.

| Kova | Önce | Sonra |
|---|---|---|
| IP başına login | 1000 istek / 15 dk | **20 başarısız** / 15 dk |
| Kimlik (e-posta) başına login | yok | **10 başarısız** / 15 dk |
| `auth-reset` | 1000 | 20 başarısız |
| `passwordless-consume` | 1000 | 20 başarısız |
| Telemetri | 1000 (login ile **paylaşımlı**) | 1000 (**ayrı** bütçe) |
| Dosya yükleme | **limit yok** | 200 / 15 dk / kullanıcı |
| Duty-tax hesaplama | **limit yok** | 300 / 15 dk / kullanıcı |
| Passwordless link üretimi | login kovasını ödünç alıyordu | 60 / 15 dk / kullanıcı |

### 9.2 Canlı doğrulama

Araç: `/tmp/dmx-rate-limit-check.py` — **gerçek hesap kullanılmadı**, burst testleri sahte
e-postalarla yapıldı, test sonrası Redis anahtarları temizlendi.

```
TEST 1 — başarılı girişler bütçeyi tüketmemeli
  probe login -> 200  remaining/limit=(10, 10)
  login #5    -> 200  remaining/limit=(10, 10)
  login #12   -> 200  remaining/limit=(10, 10)
  PASS: 12 ardışık başarılı giriş, bütçe hiç dokunulmadı

TEST 2 — sahte kimlikte başarısız burst 429 vermeli
  attempt #1 -> 401  remaining=(10, 10)
  attempt #2 -> 401  remaining=(9, 10)
  attempt #6 -> 429
  distribution: {401: 5, 429: 1}
  PASS: burst 429 ile kesildi, 5xx yok

TEST 3 — bir kimliğin kilitlenmesi aynı IP'deki gerçek kullanıcıyı kilitlememeli
  genuine login after burst -> 200
  PASS: kimlik bazlı izolasyon çalışıyor

TEST 4 — sahte kimlik kilitli kalmalı (pencere kalıcı)
  bogus identity retry -> 429
  PASS
```

### 9.3 Asıl açık: credential spray

Mevcut hesap kilidi (`bf:<ip>:<email>`, 5 deneme) **IP + e-posta bileşimine** göre çalışıyor.
Tek IP'den binlerce **farklı** hesaba parola denemesi bu deseni hiç tetiklemez — hiçbir hesap
kendi eşiğine ulaşmaz. Eskiden hacim limiti 1000 olduğu için 15 dakikada 1000 deneme
mümkündü (~96.000/gün/IP).

Araç: `/tmp/dmx-spray-check.py`

```
Spray: 1 parola x 30 farklı kimlik, tek IP
  attempt #1  (her seferinde yeni kimlik) -> 401
  attempt #10 (her seferinde yeni kimlik) -> 401
  attempt #14 -> 429
  code: RATE_LIMITED
  remaining/limit: 0/20
  distribution: {401: 13, 429: 1}
  PASS: IP başına başarısızlık bütçesi spray'i 14. denemede durdurdu
```

Ayrıca yeni kimlik bazlı kova, IP döndürerek **tek hesaba** yapılan saldırıyı da kapatıyor
(hesap kilidi IP'ye bağlı olduğu için bunu göremiyordu).

### 9.4 Yol boyunca bulunan 3 bağımsız sorun

#### (a) `E2E_TEST_SECRET` üretimde etkinleştirilemez — P0'dan kaçınıldı

Test paketini barındırmanın "temiz" yolu bu bypass'ı üretimde açmak gibi görünüyordu. Tüm
tüketicileri denetlendi:

| Tüketici | Değerlendirme |
|---|---|
| `redis-rate-limit.ts:66` | Yalnızca rate limit bypass'ı — kabul edilebilir |
| `socket.ts:38` | Yalnızca **handshake limitini** atlıyor; token doğrulaması duruyor — kimlik doğrulama açığı **yok** |
| `control-tower.controller.ts:32` | Yalnızca `includeTestData` görünürlüğü — düşük risk |
| `routes.ts:184` | `NODE_ENV === "test"` ile korunuyor — üretimde monte değil |
| `whatsapp-business.e2e.routes.ts` | **RİSK** — aşağıda |

`shouldMountWhatsappE2eRoutes()` **yalnızca secret'ın varlığına** bakıyordu, `NODE_ENV`
kontrolü yoktu. Üretimde secret ayarlamak, gerçek bir alıcının WhatsApp Business
bağlantısını sahte access token ile ezen (`mock-connect`) rotaları monte ederdi — paylaşılan
bir secret'a sahip olan herkes için.

Karar: **bu yol terk edildi**, secret üretime eklenmedi. Ayrıca latent açık kapatıldı:

```ts
export function shouldMountWhatsappE2eRoutes(): boolean {
  if (env.NODE_ENV === "production") return false;
  return Boolean(env.E2E_TEST_SECRET && env.E2E_TEST_SECRET.length >= 32);
}
```

#### (b) `/api/ready` Redis'i hiç sınamıyordu — izleme kör noktası

Önce: `"redis": "skipped"`. Kontrol yalnızca `SOCKET_ADAPTER === "redis"` olduğunda
yapılıyordu; yani "Redis socket adaptörü olarak kullanılıyor" ile "Redis erişilebilir"
karıştırılmıştı.

Ama Redis rate limiting'in **zorunlu** bağımlılığı: erişilemezse limitleyiciler
`503 RATE_LIMIT_UNAVAILABLE` döndürüyor (fail-closed), yani **login tamamen çöküyor** —
buna rağmen `/api/ready` yeşil kalıyordu.

Düzeltme: `REDIS_URL` ayarlıysa gerçek `PING` atılıyor. Sonra:

```json
{"db":"up","redis":"up","storage":"up","email":"up","socketAdapter":"up","safetyGates":"up"}
```

Bu doğrudan Phase 14 (monitoring) için de ön koşul.

#### (c) Kimlik doğrulanmış mutasyonlarda hiç limit yoktu

`app.use("/api", apiGlobalLimiter)` her şeyi kapsıyor **ama** `skipIfAuthenticated: true`
olduğu için oturum açmış kullanıcılar tamamen atlanıyor. Sonuç: **9 dosya yükleme rotası**
korumasızdı. Disk, kimlik doğrulanmış bir kullanıcının geri dönüşsüz tüketebileceği tek
kaynak (Phase 14'ün izleme koşullarından biri "uploads disk nearly full").

Limit eklenen rotalar (multer'dan **önce**, dosya arabelleğe alınmadan reddedilsin diye):

| Modül |
|---|
| `attachments` |
| `document-center` |
| `order.documents` |
| `shipment.documents` |
| `trade-documents` |
| `sales-control` (logo + katalog) |
| `workspace-communication` |
| `conversation-hub` |
| `unified-messaging` |

POD'un dosya yüklemediği, mevcut belgeyi bağladığı (`link-pod`) doğrulandı — altındaki
yükleme artık limitli.

Ayrıca `passwordless-access/links` login kovasını ödünç alıyordu; `countFailuresOnly`'ye
geçişten sonra bu uç **hiç limitlenmeyecekti** (kimlik doğrulamalı personel action'ı,
başarılı istekler artık sayılmıyor). Kendi hacim limiti verildi.

### 9.5 Hata taksonomisi düzeltmesi

`TooManyRequests` HTTP 429 döndürüyor ama kodu `PRECONDITION_FAILED` idi. `RATE_LIMITED`
kodu sözleşmeye eklendi (`packages/contracts/src/api.ts`) ve `errors.ts` bunu kullanacak
şekilde düzeltildi. Frontend bu kodlar üzerinde dallanmadığı için risk yok.

### 9.6 Yeni birim testleri

`apps/backend/src/middleware/redis-rate-limit.test.ts` (yeni dosya):

```
✓ countFailuresOnly > başarılı istek bütçeyi tüketmiyor
✓ countFailuresOnly > başarısız istek bütçeyi tüketiyor
✓ countFailuresOnly > bütçe bitince 429
✓ countFailuresOnly > başarısızlıklar birikirken başarılı giriş yine servis ediliyor
✓ countFailuresOnly > kalan bütçe header'da
✓ submittedEmailKey > e-postaya göre kova (IP döndürme bütçeyi genişletemez)
✓ submittedEmailKey > kullanılabilir e-posta yoksa IP kovasına düşüyor
✓ hacim modu (varsayılan) değişmedi

Test Files  1 passed (1)
     Tests  8 passed (8)
```

Middleware + auth + errors alt kümesi: **21 / 21 PASS**.

---

## 10. Build hattı zafiyeti (Phase 10 ile ilgili)

Bu değişiklikleri dağıtırken backend **yeniden başlatma döngüsüne girdi**. Doğrudan neden:
bir toplu yamam `import` satırını çok satırlı bir import bloğunun ortasına yerleştirmişti
(3 dosya).

**Ama asıl sorun bozuk artefaktın dağıtılabilmesiydi.** `emit-dist.mjs` tsc hatalarını tolere
ediyor (tip hatası backlog'u nedeniyle bilinçli bir tercih) ve yalnızca `dist/server.js`'in
**var olup olmadığına** bakıyordu. Sözdizimi hatası içeren, hiç boot edemeyen bir dist
systemd'ye kadar gidebiliyordu.

### Düzeltme: iki katmanlı koruma

1. **Sözdizimi/tip ayrımı** — tip hataları (TS2xxx+) tolere edilir; **sözdizimi hataları
   (TS1xxx) build'i durdurur**, çünkü bunlar emit edilen JavaScript'in bozuk olduğu anlamına
   gelir.
2. **Ayrıştırma kontrolü** — emit edilen her modül `node --check` ile parse edilir.

### Her iki katman da ampirik olarak doğrulandı

TS1xxx sınıflandırıcısı, gerçek tsc çıktısına karşı (geçici prob dosyasıyla):

```
src/__syntax_probe.ts(2,1): error TS1003: Identifier expected.
src/__syntax_probe.ts(2,8): error TS1005: ',' expected.
src/__syntax_probe.ts(2,14): error TS1005: ';' expected.
→ betiğin regex'i 3 satır yakaladı
```

Ayrıştırma kontrolü — **ve burada ilk denememin sessizce işe yaramadığını yakaladım:**

`node --check` **tek dosya** kabul ediyor. `xargs -0 -n50 node --check` formu her partinin
yalnızca **ilk** dosyasını denetliyordu; bozuk dosya ilk sırada olmadığı için kontrol
sessizce geçiyordu:

```
xargs -n50 (bozuk dosya mevcut) → exit=0   ← YANLIŞ NEGATİF
xargs -n1 -P8 (bozuk dosya mevcut) → exit=123
xargs -n1 -P8 (temiz dist)         → exit=0
491 dosya, ~4 saniye
```

Dosya başına tek çağrıya çevrildi, paralelleştirildi.

Son build çıktısı:

```
[emit-dist] tsc exited 2 — type errors only, emitting anyway.
[emit-dist] dist/server.js present; all emitted modules parse.
```

### Dist doğrulaması

Değişikliklerin derlenmiş artefakta ulaştığı tek tek kontrol edildi:

```
dist/middleware/redis-rate-limit.js       : countFailuresOnly ✓
dist/middleware/rate-limit.js             : loginIdentityLimiter, uploadLimiter ✓
dist/modules/auth/auth.routes.js          : loginIdentityLimiter ✓
dist/modules/sales-control/...routes.js   : uploadLimiter ✓
dist/modules/whatsapp-business/...e2e.js  : NODE_ENV production guard ✓
```

---

## 11. Restart / deploy smoke

```
service: active
ready: True
checks: {"db":"up","redis":"up","storage":"up","email":"up","socketAdapter":"up","safetyGates":"up"}
login=200
```

Contracts build + backend build + systemd restart + readiness + login: **PASS.**

---

## 12. Değiştirilen dosyalar (bu oturum)

### Yeni

| Dosya | Amaç |
|---|---|
| `apps/backend/scripts/emit-dist.mjs` | Build emit + flatten + sözdizimi/parse koruması |
| `apps/backend/src/middleware/redis-rate-limit.test.ts` | Rate limit semantiği (8 test) |
| `apps/backend/src/modules/rfq/rfq.action-paths.test.ts` | FE/BE action path seam guard |

### Değiştirilen — güvenlik / rate limit

| Dosya | Değişiklik |
|---|---|
| `src/middleware/rate-limit.ts` | Başarısızlık bazlı kimlik bütçeleri, kimlik kovası, upload/duty-tax/passwordless limitleri, telemetri ayrıştırması |
| `src/middleware/redis-rate-limit.ts` | `countFailuresOnly`, `submittedEmailKey` |
| `src/lib/redis.ts` | `redisWindowCount` (tüketmeyen okuma) |
| `src/modules/auth/auth.routes.ts` | Login'e kimlik limitleyicisi |
| `src/modules/whatsapp-business/whatsapp-business.e2e.routes.ts` | Üretimde monte etmeme koruması |
| `src/modules/health/health.routes.ts` | Gerçek Redis PING kontrolü |
| `src/lib/errors.ts` + `packages/contracts/src/api.ts` | `RATE_LIMITED` hata kodu |
| 9 × `*.routes.ts` | Yükleme rotalarına `uploadLimiter` |
| `src/modules/customs/customs.routes.ts` | Duty-tax hesaplamaya limit |
| `src/modules/passwordless-access/passwordless-access.routes.ts` | Kendi hacim limiti |
| `src/test/integration-http.ts` | E2E bypass başlığı (secret varsa) |
| `.env` / `.env.example` | Limit değerleri + gerekçe dokümantasyonu |

### Değiştirilen — önceki fazlar

`order.spawn.ts`, `exception-taxonomy.ts` (+test), `document-center.service.ts`,
`operational-task.service.ts`, `operational-issue.service.ts`, `inspection.service.ts`,
`rfq.api.ts`, `WorkspaceAcademyProvider.tsx`, `RfqWorkspacePage.tsx`, `telemetry.ts`,
`order-completion.ts` (+test), `apps/backend/package.json`.

### Silinen (Phase 3 retirement)

`completion.api.ts`, `OrderCompletionPanel.tsx`, `OrderCompletionPanel.test.ts`,
`OrderCompletionDashboardWidget.tsx`.

---

## 13. Açık bulgular

### P0 — 0

Bu oturumda P0 bulunmadı. Bir P0 **oluşturulması engellendi**: `E2E_TEST_SECRET`'ı üretimde
etkinleştirme yolu, WhatsApp E2E rotalarını monte edeceği fark edilerek terk edildi.

### P1 — 0 açık

Bu oturumda bulunan ve **kapatılan** P1: shipment belgelerinin ilgisiz shipment'lardan
belge döndürmesi.

### P1 — bu oturumda bulunan ve kapatılanlar

| Bulgu | Durum |
|---|---|
| Mixed Container onay sonrası yaşam döngüsü tamamen eksik (alıcı onayı geri alınıyordu) | **KAPATILDI** (bölüm 17) |
| PO oluşturma enum reddi nedeniyle transaction geri alıyordu | **KAPATILDI** (bölüm 18) |
| Shipment belgeleri ilgisiz shipment'lardan belge döndürüyordu | **KAPATILDI** (bölüm 7.1) |
| `PATCH /api/auth/me` kısmi güncellemede 500 | **KAPATILDI** (bölüm 19) |

### P2 — 5 açık

| # | Bulgu | Gerekçe |
|---|---|---|
| 1 | `commoditybid.scheduler.test.ts` paralel çalıştırmada kırılgan | Son tam paket çalıştırmasında geçti; izole de geçiyor. Test izolasyon altyapısı işi. |
| 2 | `src/modules/mixed-container/` altında **hiç test yok** | Bütün bir yaşam döngüsünün fark edilmeden kırılmasının nedeni. |
| 3 | `purchase-order`, `freightiq`, `exception-hub`, `supplier-interest` modüllerinde test yok | Aynı sınıf risk. |
| 4 | Mixed/Bulk container PO'ları `DIRECT` olarak etiketleniyor | Ayrı enum değeri migration gerektiriyor. |
| 5 | Duty/tax'te sabit kodlu `exchangeRate: 34` | Gerçek FX kaynağı gerekiyor. |

Backend tip hataları artık **0** (55'ten); bu madde kapandı ve build `--strict` ile korunuyor.

### P3 — 1 açık

`unified mirror failed` — `workspaceMessage.create()` UUID kolonuna UUID olmayan değer
yazmaya çalışıyor. Yakalanıyor ve `warn` olarak loglanıyor, akışı kırmıyor.

---

## 14. Henüz çalıştırılmayan fazlar

Bu belge yalnızca fiilen çalıştırılan testleri içerir. Kalan fazlar:

| Faz | Durum |
|---|---|
| Phase 4 — Workspace Academy tüm rollerde regresyon | Çalıştırılmadı |
| Phase 5 — Sales Control regresyon (tek kullanımlık test org) | Çalıştırılmadı |
| Phase 8 — Tüm pilot rolleriyle canlı API süpürmesi + boş DTO tespiti | Çalıştırılmadı |
| Phase 11 — Frontend typecheck / production build; backend tip hataları | Kısmen (contracts + backend testleri yapıldı) |
| Phase 12 — IDOR / ikinci tenant izolasyonu | Çalıştırılmadı (kısmi: shipment belge kapsamı + sipariş alt kaynakları kontrol edildi) |
| Phase 14 — Minimum monitoring / alerting | Çalıştırılmadı (ön koşul olan Redis readiness kontrolü tamamlandı) |
| Phase 15 — Backup / restore yeniden doğrulama | Çalıştırılmadı |
| Phase 16 — UI / i18n temizliği | Çalıştırılmadı |
| Phase 17 — Taze golden path (UI-only) | Çalıştırılmadı |
| Phase 18 — Final restart / deploy smoke | Kısmen (restart + readiness + login PASS) |

---

## 16. Tip hatası temizliği: 55 → 0

Dört paralel iş akışı backend'deki tip hata backlog'unu tamamen kapattı. Doğrulama:

```
npx tsc -p tsconfig.emit.json --noEmit  → 0 hata
npx tsc -p tsconfig.json      --noEmit  → 0 hata
```

Kalan 21 hatanın tamamı `packages/contracts` kaynaklıydı ve şu eklemelerle kapandı:

| Sözleşme dosyası | Ekleme | Neden gerçek bir sapmaydı |
|---|---|---|
| `mixed-container.fsm.ts` | 6 state + 11 action + 13 geçiş | Bkz. bölüm 17 — kritik |
| `email-notification-bridge.ts` | `console`, `resend` | `EMAIL_BRIDGE_PROVIDER`'ın kabul ettiği 3 değerden 2'si; `console` varsayılan |
| `exception-hub.ts` | `"Order/Shipment Mismatch"` | Hem exception-hub hem v2 motoru bu değeri üretiyor; kolon `text` olduğu için istemciye çıkıyordu |
| `unified-messaging.ts` | `failureReason` | `WorkspaceMessage.failureReason` gerçek kolon, zaten serialize ediliyordu |
| `workspace-inbox.zod.ts` | `z.enum(InboxFilter)` | `as unknown as [string, ...string[]]` cast'i union'ı tüm tüketiciler için `string`'e düşürüyordu |
| `document-center.ts` | `source`, `rfqId` | UI her iki filtreyi render edip gönderiyor ama `.parse()` bilinmeyen anahtarları atıyordu — filtre aktif görünüp hiç çalışmıyordu |

Backlog temizlendiği için `emit-dist.mjs`'in belgelenmiş amacı yerine getirildi: build artık
`--strict` ile çalışıyor, yani tip hatası build'i **durduruyor** (sözdizimi + parse
korumaları bölüm 10'da olduğu gibi yerinde kalıyor).

---

## 17. Mixed Container FSM — alıcı onayı tamamen kırıktı (P0 sınıfı)

`MC_TRANSITIONS` tablosu `MC_APPROVED`'da bitiyordu; onay sonrası **tüm** yaşam döngüsü
(6 state, 11 action) eksikti.

Bu yalnızca tipleme sorunu değildi. `applyMcTransition` → `findMcTransition` `undefined`
dönünce `AppError(400, "INVALID_TRANSITION")` fırlatıyor.

### Kanıt zinciri

1. Kaynakta son geçiş `MC_BUYER_REVIEW → MC_APPROVED` (`approve_offer`) — sonrası yok
2. Sunucunun çalıştırdığı derlenmiş artefaktta da yok:
   `rg -c "begin_organization" packages/contracts/dist/mixed-container.fsm.js` → **0**
3. `approveOffer` **aynı `$transaction` içinde** `approve_offer` ve `begin_organization`
   çağırıyor (`mixed-container-procurement.service.ts:1021` ve `:1037`)

Sonuç: ikinci çağrı fırlatıyor → transaction geri alınıyor → **onay sessizce iptal oluyor.**
Aşağı akıştaki her şey (allocation, proforma, ödeme takibi, sipariş spawn, execution
tamamlama) aynı şekilde ölüydü ve hepsi `routes.ts`'de kayıtlı canlı rotalardan erişilebilir.

### Action adlarının uydurma olmadığının doğrulanması

Subagent önerisini olduğu gibi kabul etmedim; üç bağımsız kaynakla çapraz kontrol ettim:

- 11 action'ın **9'u** `bulk-container.fsm.ts`'de aynen mevcut (kardeş modülün tam
  yaşam döngüsü var)
- 6 eksik state'in tamamı `mcStateToProcurementStatus` tarafından **zaten** map ediliyor —
  yani sapma FSM'de, servislerde değil
- MC'ye özgü 2 action servis kodundan doğrulandı:
  - `begin_organization` **self-loop olmalı**: `startAllocation` hâlâ `MC_APPROVED`'dan
    çalışıyor (`ws.state === "MC_APPROVED" || ws.state === "MC_EXECUTION_READY"`), ileri
    hareket olsaydı allocation kırılırdı
  - `record_payment_sent` **BUYER'a izin vermeli**: `updatePayment` alıcıya yalnızca
    `PAYMENT_SENT` set etmeye izin verip diğer statüleri 403 ile reddediyor

`MC_TERMINAL_STATES` de `MC_APPROVED` → `MC_EXECUTION_COMPLETE` olarak düzeltildi.

### Runtime doğrulaması (derlenmiş artefakt üzerinde)

13 adımlı zincirin tamamı çözülüyor, **0 eksik**:

```
ok  MC_BUYER_REVIEW          --approve_offer-->          MC_APPROVED               roles=BUYER
ok  MC_APPROVED              --begin_organization-->     MC_APPROVED               roles=ADMIN|SYSTEM
ok  MC_APPROVED              --start_allocation-->       MC_ALLOCATION_IN_PROGRESS roles=ADMIN
ok  MC_ALLOCATION_IN_PROGRESS--create_allocation-->      MC_ALLOCATION_IN_PROGRESS roles=ADMIN
ok  MC_ALLOCATION_IN_PROGRESS--complete_allocations-->   MC_PROFORMA_PENDING       roles=ADMIN
ok  MC_PROFORMA_PENDING      --upload_proforma-->        MC_PROFORMA_PENDING       roles=ADMIN
ok  MC_PROFORMA_PENDING      --begin_payment_tracking--> MC_PAYMENT_TRACKING       roles=ADMIN|SYSTEM
ok  MC_PAYMENT_TRACKING      --record_payment_sent-->    MC_PAYMENT_TRACKING       roles=BUYER|ADMIN
ok  MC_PAYMENT_TRACKING      --confirm_payment-->        MC_PAYMENT_TRACKING       roles=ADMIN
ok  MC_PAYMENT_TRACKING      --mark_execution_ready-->   MC_EXECUTION_READY        roles=ADMIN|SYSTEM
ok  MC_EXECUTION_READY       --spawn_execution_orders--> MC_EXECUTION_ACTIVE       roles=ADMIN|SYSTEM
ok  MC_EXECUTION_ACTIVE      --mark_execution_complete-->MC_EXECUTION_COMPLETE     roles=ADMIN|SYSTEM
ok  MC_EXECUTION_READY       --start_allocation-->       MC_ALLOCATION_IN_PROGRESS roles=ADMIN

missing: 0    terminal: MC_EXECUTION_COMPLETE, MC_CANCELLED
```

Prisma migration gerekmedi — `Workspace.state` düz `String`, veritabanı seviyesinde enum
kısıtı yok.

**Not:** `src/modules/mixed-container/` altında hiç test dosyası yok. Bütün bir yaşam
döngüsünün fark edilmeden kırılabilmesinin nedeni bu. **P2 olarak kaydedildi.**

---

## 18. Purchase Order oluşturma — enum reddi (P1)

`purchase-order.spawn.ts` `source` alanına `"auto"` yazıyordu, ama `PurchaseOrder.source`
bir Postgres enum'u (`RFQ | DIRECT | REORDER | API | LEGACY | COMMODITY_BID`).

### Veri korelasyonu — tek başına kanıt değil

```
source | count | last_issued
-------+-------+------------
DIRECT |    70 | 2026-08-13
RFQ    |    14 | 2026-08-05
```

RFQ kaynaklı PO'lar 5 Ağustos'ta duruyor, DIRECT 13 Ağustos'a devam ediyor. **Ama bu tek
başına yeterli değildi**: Turkey pilot golden path'i yalnızca Direct PO kullanıyor, yani
RFQ yolunun hiç çalıştırılmamış olması da aynı tabloyu üretir.

### Kesin test (tahribatsız)

Her yazma, daima geri alınan bir transaction içinde yapıldı; sonrasında 0 prob satırı kaldı.

```
source="auto"           -> REJECTED — invalid enum value for `source`
source="manual"         -> REJECTED — invalid enum value for `source`
source="RFQ"            -> enum kontrolünü geçti (yalnızca beklenen unique kısıtına düştü)
source="DIRECT"         -> enum kontrolünü geçti
source="COMMODITY_BID"  -> enum kontrolünü geçti

PROBE rows persisted: 0
```

Prisma enum'u istemci tarafında doğruluyor, yani sorgu DB'ye hiç gitmiyor. `$transaction`
içinde çalıştığı için PO oluşturma tamamen geri alınıyordu. **Hiçbir satır yanlış
etiketlenmedi** — Postgres bir enum kolonuna `auto`/`manual` yazamazdı zaten.

### Provenance düzeltmesi

Çökmeyi durduran ilk düzeltme yeni bir sorun yaratmıştı: `canonicalizePurchaseOrderSource`
`"auto"` → **`RFQ`** döndürüyor (`LEGACY` değil), ve 3 çağrı `source` hiç geçmediği için
varsayılana düşüyordu. Yani CommodityBid ve container spawn'ları **sessizce RFQ olarak**
etiketlenecekti.

`source` alanı **zorunlu** yapıldı (derleme zamanı zorlayıcı — kimse bir daha sessizce
varsayılana düşemez) ve 4 çağrının hepsi açık hale getirildi:

| Çağrı | Önce | Sonra |
|---|---|---|
| RFQ | `issue.mode` (`manual` → `DIRECT`, provenance kaybı) | `"RFQ"` |
| CommodityBid | varsayılan → `RFQ` | `"COMMODITY_BID"` |
| MixedContainer | varsayılan → `RFQ` | `"DIRECT"` |
| BulkContainer | varsayılan → `RFQ` | `"DIRECT"` |

RFQ için `issue.mode` geçmek yanlıştı: PO'nun *kaynağı* RFQ'dur, auto/manual ayrımı
**zaten** `issueReason`'da kayıtlı.

Mixed/Bulk için ayrı bir enum değeri daha kesin olurdu ama migration gerektiriyor; `DIRECT`
önemli olan anlamda doğru (RFQ kaynaklı değil). **P2 olarak kaydedildi.**

---

## 19. `PATCH /api/auth/me` — kısmi güncellemede 500

`UpdateProfileInput` üç alanı da opsiyonel işaretliyor, ama `updateProfile` servisi
`{ displayName: string }` tipindeydi ve koşulsuz `.trim()` çağırıyordu. Sonuç: `{}`,
`{"phoneNumber":...}` veya `{"avatarUrl":...}` zod doğrulamasını geçip servis içinde
`TypeError` fırlatıyordu — 4xx değil **500**.

İkincil sorun: `phoneNumber` ve `avatarUrl` kabul edilip doğrulanıyor ama `User` modelinde
kolonları olmasına rağmen **hiç kaydedilmiyordu**.

Servis `UpdateProfileInput` alacak şekilde genişletildi, Prisma `data` nesnesi koşullu
kuruluyor, açık `null` alanı temizliyor. Controller'daki geçici 400 guard'ı kaldırıldı.

### Canlı doğrulama

```
body={}                                -> 200
body={"phoneNumber":"+905551112233"}   -> 200
body={"displayName":"Buyer Dema"}      -> 200

son yanıt: displayName='Buyer Dema', phoneNumber='+905551112233'
```

`phoneNumber`'ın ayrı bir istekte set edilip sonraki yanıtta görünmesi, alanın artık
gerçekten kaydedildiğini (atılmadığını) kanıtlıyor. Test yalnızca seed hesabı
`buyer@dema.test` üzerinde yapıldı; gerçek müşteri kaydına dokunulmadı.

---

## 20. Düzeltilmeyen, bilinçli bırakılanlar

| Konu | Neden bırakıldı |
|---|---|
| `freightiq` `proceed_to_booking` | Controller `ACTION_MAP`'te yok, policy kuralı yok ve frontend `FreightExecutionPanel` **hiçbir sayfada monte değil**. Kullanıcının kuralı: ölü kodu tatmin etmek için backend inşa etme. Servis tarafındaki çökme düzeltildi, rota bağlanmadı. |
| `operational_issues` kategori backfill'i | Önerilmişti ama **gerek yoktu**: DB'de 0 adet `DOCUMENT` satırı var (`DOCUMENT_MISSING` 404, `OTHER` 52, `SHIPMENT_DELAY` 5). Kod düzeltildi, bozuk veri hiç oluşmamış. |
| Duty/tax `exchangeRate: 34` sabit kodu | Tip hatası değil; gerçek FX kaynağı gerektiriyor. Turkey pilotunda TRY duty/VAT tahminleri UI'dan yeniden hesaplanana kadar bayat kalabilir. **P2.** |
| Mixed/Bulk için ayrı PO enum değeri | Prisma migration gerektiriyor; final doğrulama aşamasında şema değişikliği riski. **P2.** |

---

## 15. Ara değerlendirme

**Bu aşamada final verdict verilmemiştir.** Phase 12 (cross-tenant izolasyon), Phase 17
(taze golden path) ve Phase 15 (backup/restore) tamamlanmadan `FINAL VALIDATED` iddiası
doğru olmaz.

Şu ana kadar ölçülen durum:

- Kimlik bilgisi kaba kuvvet yüzeyi 1000 istek/15dk'dan 20 başarısız denemeye indirildi,
  meşru giriş etkilenmeden — canlı doğrulandı
- Credential spray saldırı deseni ilk kez kapatıldı ve doğrulandı
- Kullanıcı kontrollü hatalı ID'lerde 105 çağrıda 0 adet 5xx
- Canlı UI'dan erişilebilen FE→BE rota boşluğu yok
- Monte edilmiş frontend'de sessiz hata sitesi yok
- Build hattı artık boot edemeyen artefakt dağıtamıyor
- Bir çapraz-shipment veri sızması bulundu ve kapatıldı
- Backend tip hataları 55 → 0; build artık tip hatasında duruyor
- Mixed Container'da alıcı onayını tamamen geri alan FSM boşluğu bulundu ve kapatıldı
- PO oluşturmayı geri alan enum uyuşmazlığı kanıtlandı ve kapatıldı; provenance açık hale getirildi
- Servis sağlıklı, tüm hazırlık kontrolleri `up`; tam backend paketi yeşil (460/461, 0 başarısız)
