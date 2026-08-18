# Düzeltilen Hatalar

Bu belge yalnızca **bulunup düzeltilen hataları** listeler. Süreç anlatımı, plan veya
devam eden iş içermez. Her madde: belirti → kök neden → düzeltme → doğrulama.

Doğrulama durumu (son çalıştırma):

| Paket | Test | Typecheck |
| --- | --- | --- |
| contracts | 43 dosya / 234 test PASS | temiz |
| backend | 108 dosya / 486 test PASS (1 skip) | temiz |
| frontend | 53 dosya / 218 test PASS | temiz + production build PASS |

---

## P0 — Veri bozulması / kırık akış

### 1. Purchase Order oluşturma Prisma enum hatasıyla düşüyordu

**Belirti:** Order workspace spawn edildiğinde PO oluşturma `PurchaseOrder.source`
kolonunda patlıyordu.
**Kök neden:** `purchase-order.spawn.ts` içinde `source` alanı `?? "auto"` ile
dolduruluyordu; `"auto"` / `"manual"` değerleri kolonun enum tanımında yok.
**Düzeltme:** `CreatePoOnOrderSpawnInput.source` zorunlu hale getirildi, `?? "auto"`
fallback'i kaldırıldı ve her çağıran gerçek provenance'ı geçiyor:
`rfq.service.ts` → `"RFQ"`, `commoditybid.service.ts` → `"COMMODITY_BID"`,
`mixed-container-execution.service.ts` ve `bulk-container-execution.service.ts` → `"DIRECT"`.
Bu aynı zamanda tüm PO'ların kaynağını `"auto"` diye yanlış etiketlemesini de bitirdi.

### 2. Mixed Container FSM'inin onay sonrası tüm yaşam döngüsü eksikti

**Belirti:** Buyer onayı veriyor, transaction geri alınıyordu.
**Kök neden:** `packages/contracts/src/mixed-container.fsm.ts` onay sonrası state/action
tanımlarını içermiyordu; geçerli geçişler tabloda yoktu.
**Düzeltme:** `MC_ALLOCATION_IN_PROGRESS` ve `begin_organization` dahil eksik state/action'lar
eklendi, 13 eksik geçiş `MC_TRANSITIONS`'a yazıldı, `MC_TERMINAL_STATES` güncellendi.

### 3. Sistem olayları UUID kolonuna `"system"` yazmaya çalışıyordu

**Belirti:** Sistem mesajı üretilen akışlarda yazma hatası.
**Kök neden:** `messaging-write.bridge.ts` sistem mesajları için `authorUserId: actor.id`
ile `"system"` sabitini geçiyordu; kolon UUID.
**Düzeltme:** `authorUserId` zinciri boyunca `string | null` olacak şekilde genişletildi
(`unified-messaging.repository.ts`, `unified-messaging-write.orchestrator.ts`) ve bridge
artık `input.actor?.id ?? null` gönderiyor.
**Doğrulama:** `system-event-author.test.ts` (yeni regresyon testi).

### 4. Shipment doküman listesi ilgisiz sevkiyatların dokümanlarını döndürüyordu

**Belirti:** `GET /api/shipments/:id/documents` başka sevkiyatlara ait dokümanları
listeliyor, olmayan sevkiyat için de 200 dönüyordu.
**Kök neden:** `document-center.service.ts` filtresindeki `|| d.shipmentRef` kaçağı; ayrıca
sevkiyat varlık kontrolü hiç yapılmıyordu.
**Düzeltme:** `|| d.shipmentRef` kaldırıldı, sevkiyat varlık kontrolü eklendi (artık 404),
eksik `poNumber` / `poOrderId` / `orderWorkspaceUrl` alanları dolduruldu.

---

## Güvenlik / kötüye kullanım sertleştirme

### 5. Login rate-limit başarılı girişleri de sayıyordu, brute-force koruması işlevsizdi

**Kök neden:** Tüm credential endpoint'leri tek bir `BURST_MAX` sayacını paylaşıyordu ve
her istek (başarılı dahil) sayılıyordu; `LOGIN_RATE_LIMIT_MAX=1000` pratikte koruma sağlamıyordu.
**Düzeltme:** `redis-rate-limit.ts`'e `countFailuresOnly` seçeneği ve `submittedEmailKey`
eklendi; credential endpoint'leri artık **yalnızca başarısız denemeleri** sayıyor.
`FAILED_LOGIN_MAX_PER_IP` ve `FAILED_LOGIN_MAX_PER_IDENTITY` ile IP ve kimlik başına ayrı
limitler tanımlandı, telemetri limiti (`TELEMETRY_RATE_LIMIT_MAX`) login'den ayrıldı.
`redisWindowCount` ile sayaç artırmadan okuma yapılabiliyor.
**Doğrulama:** `redis-rate-limit.test.ts` (yeni).

### 6. WhatsApp E2E rotaları production'da mount edilebiliyordu

**Kök neden:** `shouldMountWhatsappE2eRoutes()` yalnızca `E2E_TEST_SECRET` varlığına bakıyordu.
**Düzeltme:** `whatsapp-business.e2e.routes.ts` içine `NODE_ENV === "production"` erken
çıkışı eklendi.

### 7. Dosya yükleme ve hesaplama yoğun uçlarda rate-limit yoktu

**Düzeltme:** Tüm multipart yükleme rotalarına `uploadLimiter` (ör.
`attachments.routes.ts`, `order.documents.routes.ts`), duty-tax
`calculate` / `recalculate` uçlarına `dutyTaxCalcLimiter` eklendi.

### 8. `/api/ready` Redis'i "skipped" raporluyordu

**Kök neden:** Kontrol yalnızca socket adapter kullanımında çalışıyordu; oysa Redis
rate-limiting için sert bağımlılık.
**Düzeltme:** `health.routes.ts` artık `REDIS_URL` tanımlıysa Redis'i doğrudan ping'liyor.

### 9. `TooManyRequests` yanlış hata kodu döndürüyordu

**Kök neden:** `PRECONDITION_FAILED` kullanılıyordu.
**Düzeltme:** `ErrorCodes.RATE_LIMITED` eklendi (`packages/contracts/src/api.ts`) ve
`lib/errors.ts` bunu kullanıyor.

### 10. Cross-tenant izolasyon testi yanlış kurgulanmıştı

**Belirti:** "atanmış broker kendi dosyasını okuyabilir" testi 403 alıyordu.
**Kök neden:** Test, buyer A'nın listesindeki **ilk** customs case'i alıyor ve brokerın ona
atandığını varsayıyordu; o dosyanın `brokerUserId`'si `null`. 403 doğru davranıştı, test hatalıydı.
**Düzeltme:** Test artık atanmış dosyayı brokerın kendi `GET /api/partner/home` yükünden
(`customsCases[]`) alıyor. Ayrıca **atanmamış** bir dosyada brokerın reddedildiğini
doğrulayan yeni bir negatif test eklendi.
**Doğrulama:** `tenant-isolation.test.ts` 16/16 PASS.

---

## Hata taksonomisi — kullanıcı girdisi asla 5xx/200 üretmemeli

### 11. Olmayan order için alt kaynaklar boş liste ile 200 dönüyordu

**Belirti:** Ayrıcalıklı roller için `GET /api/orders/:id/tasks|issues|inspections`
var olmayan order ID'lerinde 200 + boş liste veriyordu; "veri yok" ile "kayıt yok" ayrılamıyordu.
**Kök neden:** `assertOrderAccess` / `assertAccess` ayrıcalıklı rollerde order varlık
kontrolünü atlıyordu.
**Düzeltme:** `operational-task.service.ts`, `operational-issue.service.ts` ve
`inspection.service.ts` içine order varlık kontrolü eklendi (artık 404).

### 12. Geçersiz commercial-document ID'si yanlış sınıflandırılıyordu

**Kök neden:** `commercial-document.service.ts` içinde `CommercialDocumentSource` için
geçersiz `TASK:` öneki.
**Düzeltme:** Önek kaldırıldı; geçersiz ID artık 400 dönüyor.

---

## Veri doğruluğu ve iş kuralları

### 13. Order lineage kaynağı her zaman `RFQ` olarak yazılıyordu

**Kök neden:** `order.spawn.ts` yeni order için `origin` alanını hiç set etmiyordu, şema
default'u devreye giriyordu.
**Düzeltme:** `originFromParentType()` eklendi (contracts'taki
`canonicalizeOrderWorkspaceOrigin`'a delege eder), `SpawnOrderInput` `SpawnParentType` ve
`auditEvent` içerecek şekilde genişletildi, `orderWorkspace.create` artık
`origin: input.origin ?? originFromParentType(input.parentType)` yazıyor.

### 14. `DELIVERY_DELAY` istisnası order dispute'a yansımıyordu

**Kök neden:** `exception-taxonomy.ts` içinde `SHIPMENT_EXCEPTION_TO_ORDER_MIRROR` için
`DELIVERY_DELAY: "none"`.
**Düzeltme:** `"suggest_dispute"` yapıldı; `exception-taxonomy.test.ts` yalnızca
`DELIVERY_DELAY`'in yansıdığını açıkça doğrulayacak şekilde güncellendi.

### 15. `PATCH /api/auth/me` kısmi güncellemede 500 veriyor, alanları sessizce düşürüyordu

**Kök neden:** `auth.service.updateProfile` girdisi hatalı tiplenmişti; `phoneNumber` ve
`avatarUrl` hiç yazılmıyordu.
**Düzeltme:** Girdi `UpdateProfileInput` olarak genişletildi, üç alan koşullu güncelleniyor,
`null` değerleri doğru işleniyor. `auth.controller.ts` içindeki artık gereksiz `displayName`
kontrolü kaldırıldı.

### 16. Customs broker geçersiz operational-issue kategorisi kullanıyordu

**Düzeltme:** `customs-broker.service.ts` içinde `"DOCUMENT"` → `"DOCUMENT_MISSING"`.

### 17. Supplier interest hâlâ eski kategori ID'leriyle çalışıyordu

**Kök neden:** Modül serbest metin etiket modeline geçirilmemişti.
**Düzeltme:** `getInterests`, `setInterests`, `listSupplierOrganisations`
`Organisation.interestAreas` + `normalizeInterestLabels()` kullanacak şekilde yazıldı.

### 18. Kur oranları koda gömülüydü

**Kök neden:** Customs auto-seed içinde sabit `34` (TRY/USD) ve `1.08` (EUR).
**Düzeltme:** `CUSTOMS_DEFAULT_USD_TRY_RATE` / `CUSTOMS_DEFAULT_USD_EUR_RATE` env
değişkenlerine taşındı (`env.ts`, `.env.example`), `exchangeRateSource` artık
`SYSTEM_CONFIGURED`.

### 19. Diğer servis düzeltmeleri

- `pre-arrival-customs.service.ts`: `existing.status === "CANCELLED"` dalı erişilemezdi, kontrol sadeleştirildi.
- `landed-cost.service.ts`: subtotal reducer'ında null kontrolü yapılmıyordu, açık döngüye çevrildi.
- `inland-delivery.service.ts`: event payload'ı `Prisma.InputJsonObject` olarak tiplendi.
- `shipment-portfolio.service.ts`: nullable `parentWorkspaceId` guard'ı eklendi, eksik PO kimlik alanları dolduruldu.
- `catalog-rfq-ingest.service.ts`: contract'ta tanımlı olmayan `productImageUrl` okuması kaldırıldı.
- `mixed-container-execution.service.ts`: `getExecution` eksik `opts: { readOnly?: boolean }` parametresi uygulandı.

---

## Contract drift (kod ile sözleşme uyuşmazlıkları)

Hepsi tip hatası veya çalışma zamanı sapması üretiyordu:

| Dosya | Eksik/hatalı olan | Düzeltme |
| --- | --- | --- |
| `email-notification-bridge.ts` | `EmailBridgeProviderId` | `"console"` ve `"resend"` eklendi |
| `exception-hub.ts` | `ExceptionType`, `ExceptionHubDetail` | `"Order/Shipment Mismatch"` ve `orchestratorRecommendation` eklendi |
| `unified-messaging.ts` | `UnifiedMessageDto` | `failureReason: string \| null` eklendi |
| `workspace-inbox.zod.ts` | `filter` | union tipini yok eden `as unknown as [string, ...string[]]` cast'i kaldırıldı |
| `document-center.ts` | `DocumentCenterQuery` | `source` ve `rfqId` filtreleri eklendi |
| `freightiq.ts` | `FreightAction`, `FreightSummary` | `"proceed_to_booking"` ve `execution?` eklendi |
| `telemetry.ts` | `TelemetryEventName` | `academy.persist_failed` eklendi |

`freightiq` düzeltmesi ayrıca servisteki yerel tip workaround'larını ve
`proceed_to_booking` için özel yetkilendirme yolunu ortadan kaldırdı: kural artık
`freightiq.policy.ts` içinde merkezi (`proceed_to_booking: ["BUYER", "ADMIN"]`).
Aynı şekilde `exception-hub.service.ts` içindeki yerel supertype kaldırıldı.
**Doğrulama:** `freightiq.policy.test.ts` (yeni).

---

## Frontend

### 20. İki RFQ aksiyonu 404 üretiyordu

**Belirti:** `unpublish_rfq` ve `admin_set_state` canlı UI'dan 404 dönüyordu.
**Kök neden:** `rfq.api.ts` içinde bu aksiyonlar için açık eşleme yoktu; kebab-case
fallback backend rotasıyla uyuşmuyordu.
**Düzeltme:** `unpublish_rfq → "unpublish"` ve `admin_set_state → "set-state"` eşlemeleri
eklendi.
**Doğrulama:** `rfq.action-paths.test.ts` — frontend eşlemelerini gerçek backend rotalarına
karşı doğrulayan yeni koruma testi (Node ortamı gerektirdiği için backend tarafında).

### 21. Workspace Academy hataları sessizce yutuyordu

**Belirti:** Backend hatasında boş UI, hiçbir iz yok.
**Kök neden:** `WorkspaceAcademyProvider.tsx` içinde birden fazla `catch(() => {})`.
**Düzeltme:** Tümü `reportPersistFailure` (telemetri + `console.warn`) çağrısıyla değiştirildi.
`RfqWorkspacePage.tsx` içindeki supplier activity view kaydı için boş catch da
`console.warn` ile görünür yapıldı.

### 22. PO workspace ekranı ham enum ve kırık link gösteriyordu

**Kök neden:** `PoWorkspacePage.tsx` durumu ham enum olarak basıyor, `orderId` yokken
bozuk bağlantı üretiyor, satır kalemlerinde formatlayıcı kullanmıyordu.
**Düzeltme:** `purchaseOrderStatusLabel` kullanılıyor, bağlı order koşullu render ediliyor
(yoksa `po-order-unavailable`), satır kalemlerinde `emptyValue`, `formatPoMoney`,
`formatPoQuantity` ve kısmi fiyatlama için `summarizeLinePricing` uygulanıyor.

### 23. Çoklu paket teklifleri tek bir harmanlanmış fiyata indirgeniyordu

**Belirti:** Bir tedarikçi birden fazla paket boyutu teklif ettiğinde buyer, tek bir
karma birim fiyat görüyordu; asıl fiyatlar ancak award modalı açılınca görünüyordu.
**Düzeltme:** `QuotationComparisonPanel.tsx` artık `buildVariationsFromQuotation` ile
varyasyonları çözüyor; birden fazla varyasyon varsa tek fiyat kutusu yerine her varyasyonun
adı, birim fiyatı, fiyat birimi ve paketlemesini gösteren bir ızgara (`variationGridClass`)
render ediliyor. Varyasyonlar arasında ortak olan şartlar tablosu bir kez gösteriliyor.

### 24. `login-redirect.ts` eksik bir `ROLE_DASHBOARD` kopyası taşıyordu

**Kök neden:** Kanonik map elle kopyalanmış ve güncel değildi; bazı roller yanlış
yönlendiriliyordu.
**Düzeltme:** Kopya kaldırıldı, `@dmx/contracts/auth` içindeki kanonik `ROLE_DASHBOARD`
import ediliyor.

### 25. Yarım kalmış `order-completion` özelliği launch kodunda duruyordu

**Belirti:** Frontend bileşenleri ve contract'ları vardı, backend implementasyonu yoktu.
**Karar:** Order kapanışı Order FSM'in kanonik sorumluluğu; paralel bir tamamlanma sistemi
kurulmadı. Özellik Türkiye pilotu için **retire** edildi.
**Düzeltme:** `completion.api.ts`, `OrderCompletionPanel.tsx`, testi ve
`OrderCompletionDashboardWidget.tsx` silindi; `order-completion.ts` içine gerekçeli
`RETIRED` notu yazıldı ve `order-completion.test.ts`'e kapanışın Order FSM'e ait olduğunu
belgeleyen testler eklendi.

---

## Build ve test altyapısı

### 26. Backend build'i tip hatasında `flatten-dist.sh`'i atlıyordu → dist drift

**Belirti:** `tsc` hata verince flatten adımı hiç çalışmıyor, deploy edilen artefakt
kaynakla uyuşmuyordu.
**Düzeltme:** `scripts/emit-dist.mjs` eklendi; `tsc`'yi çalıştırıp flatten adımını **her
zaman** yürütüyor, ek olarak syntax hatası kontrolü ve emit edilen JS modüllerinde
parse-check yapıyor. `package.json` build script'i bunu kullanıyor ve strict mod korunuyor.

### 27. 55 backend tip hatası

Tüm modüllerde giderildi (yukarıdaki contract drift ve servis düzeltmelerinin çoğu buradan
çıktı). Backend typecheck artık temiz.

### 28. Frontend testleri `node_modules` altını topluyor ve React'i production modda koşuyordu

**Belirti:** Alakasız paket testleri toplanıyor, `act(...)` uyarıları çıkıyordu.
**Düzeltme:** `vitest.config.ts`'e yalnızca `src/**` toplayan `include` ve build
dizinlerini dışlayan `exclude` eklendi; `env: { NODE_ENV: "test" }` ile React development
build'i garanti edildi.

### 29. `yarn install` devDependencies'i kuruyormuş gibi davranıp atlıyordu

**Kök neden:** Ortamda `NODE_ENV=production` set olduğu için yarn production kurulumu
yapıyordu; ayrıca bir transitive bağımlılık Node >= 22 talep ediyordu.
**Düzeltme:** `.yarnrc`'ye `--install.production false`, `--install.ignore-engines true`,
`--add.ignore-engines true` eklendi; artık kalmış `apps/frontend/node_modules` symlink'i
silindi, `.build-node_modules` ve `.build-*/` `.gitignore`'a eklendi.

### 30. Gerçek davranışın gerisinde kalmış testler

Aşağıdaki testler hatalı beklentiler yüzünden kırıktı; beklentiler kanonik davranışa
göre güncellendi (ürün kodu değiştirilmedi, hatalı olan testlerdi):

- `purchase-order.workspace.test.ts` — legacy PO statüleri; artık kanonik FSM etiketleri (`ISSUED` → "Submitted") ve deprecated statülerin kanoniğe eşlendiği ayrıca test ediliyor.
- `guideEligibility.test.ts` — fixture'larda `guideVersion` sabit yazılmıştı, guide sürümü her artışta yanlış negatif üretiyordu. Fixture'lar sürümü canlı `guideById`'den okuyor; ayrıca sürüm artınca reddedilmiş guide'ın yeniden önerildiğini doğrulayan test eklendi.
- `RequireRole.test.tsx` — eski dashboard yolları ve doğrudan `window.location.replace` beklentisi; artık `ROLE_DASHBOARD` sabitleri kullanılıyor ve `redirectToLogin` spy'lanıyor.
- `PoListPage.test.tsx` — statü rozeti beklentisi "Issued" → "Submitted".
- `PoWorkspacePage.test.tsx` — güncel DOM yapısı, insan-okunur statü/kaynak ve `orderId` yokluğu senaryosu.
- `QuotationComparisonPanel.test.tsx` — yanlış `data-testid` (`quotation-award-close-modal` → `quotation-award-select-modal`) ve pazarlama metnine bağlı assertion; artık kontrol elemanları doğrulanıyor.

### 31. Playwright'a bağımlı olduğu için yüklenemeyen backend testi

**Kök neden:** `messaging-socket-dedup.two-process.test.ts` `playwright` import ediyordu.
**Düzeltme:** Native `fetch` ve `postJson` yardımcılarıyla yazıldı.
