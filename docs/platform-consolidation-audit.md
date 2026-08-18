# Platform Consolidation & UX Audit

**Tarih:** 2026-06-03  
**Kapsam:** Sprint 5E sonrası (RFQ, CommodityBid, PO, Order, Shipment, FreightIQ, Trade Documents, Control Tower, Workspace Communication)  
**Yöntem:** Kod tabanı incelemesi, mevcut E2E akışları (`05-order-flow`, `13-po-management`, `14-workspace-communication`), menü/route envanteri  
**Karar:** Yeni Sprint 5F özelliği önerilmez; önce konsolidasyon ve UX düzeltmeleri (`recommended-fixes.md`)

---

## Özet

| Boyut | Durum |
|-------|--------|
| **Çekirdek iş akışı (API + workspace)** | Çalışıyor — RFQ → PO → Order → Shipment zinciri backend ve workspace URL’leri üzerinden tamamlanabilir |
| **Keşif katmanı (listeler, dashboard, menü)** | Parçalı — birçok menü öğesi `PlaceholderPage`; kullanıcı workspace’e bildirim veya RFQ/CB üzerinden “sıçrayarak” ulaşıyor |
| **Bilgi mimarisi** | RFQ / PO / Order / Shipment ayrı kavramlar; PO menüde yok; dokümanlar hem workspace içinde hem ayrı menüde (placeholder) |
| **Operasyon görünürlüğü** | Control Tower güçlü; PO alert deep-link ve yüksek hacim senaryolarında boşluklar var |
| **Kilitleme (WhatsApp)** | RFQ/Order/Shipment’ta Communication Layer iyi; keşif ve timeline okunabilirliği zayıf olduğunda dış kanala kaçış riski yüksek |

---

## Bulgular

### PCA-001 — Menüde “Orders” ve “Documents” var, uygulama yok

| Alan | Değer |
|------|--------|
| **Önem** | **Critical** |
| **Denetim** | Buyer / Supplier / Admin consolidation |
| **Sorun** | `/buyer/orders`, `/supplier/orders`, `/admin/orders` ve tüm `/…/documents` rotaları `PlaceholderPage` render ediyor. İthalatçı “Sipariş takip et” için menüye tıklayınca ölü uç görür. |
| **Kanıt** | `apps/frontend/src/routes/index.tsx` (satır 70–71, 78–80, 90–93); `navigation.ts` aynı path’leri listeler |
| **Etki** | Buyer Journey adım 6–7; Supplier Journey adım 5–6; operasyon ekibi admin Orders’tan toplu görünüm alamaz |

### PCA-002 — PO workspace var, platform navigasyonunda yok

| Alan | Değer |
|------|--------|
| **Önem** | **High** |
| **Sorun** | PO yalnızca Order workspace içindeki `PoSummaryPanel` linki (`/workspace/po/:id`) ile keşfediliyor. Sidebar’da PO, “Trade Documents” veya “Shipments” yok. |
| **Kanıt** | `navigation.ts` (BUYER/SUPPLIER/ADMIN); `PoSummaryPanel.tsx`; `PoWorkspacePage.tsx` |
| **Etki** | “PO oluştur / kabul et” sonrası tedarikçi ve alıcı PO’yu aramak zorunda kalır |

### PCA-003 — RFQ `PO_ISSUED` sonrası Order’a geçiş kırık veya belirsiz

| Alan | Değer |
|------|--------|
| **Önem** | **Critical** |
| **Sorun** | `rfq.scripts.ts` `PO_ISSUED` için `fallbackPrimary.href: "/workspace/order/{{orderId}}"` tanımlar; `WhatHappensNextCard` fallback CTA’da `href` kullanmıyor — yalnızca `onPrimaryClick(null)` çağırıyor. RFQ frontend’de `spawned-orders` API’si yok (CommodityBid’de var). `RfqWorkspacePage` `orderId` vars geçmiyor. |
| **Kanıt** | `rfq.scripts.ts` 147–155; `WhatHappensNextCard.tsx` 139–148; `commoditybid` `spawnedOrders` vs RFQ grep boş |
| **Etki** | Buyer Journey: PO sonrası “Order takip et” net CTA yok → WhatsApp / e-posta |

### PCA-004 — Dashboard’lar canlı veri yerine MOCK

| Alan | Değer |
|------|--------|
| **Önem** | **High** |
| **Sorun** | Buyer ve Supplier dashboard stat kartları ve “recent activity” sabit `MOCK` nesnesinden geliyor; API bağlı değil. |
| **Kanıt** | `BuyerDashboardPage.tsx`, `SupplierDashboardPage.tsx` |
| **Etki** | İlk girişte güven kaybı; “sonraki aksiyon” dashboard’dan okunamaz |

### PCA-005 — İki iletişim modeli (legacy clarification + Workspace Communication)

| Alan | Değer |
|------|--------|
| **Önem** | **Medium** |
| **Sorun** | RFQ workspace `WorkspaceCommunicationPanel` kullanıyor; `RfqClarificationPanel` ve `post_clarification` FSM/API hâlâ duruyor. Order FSM’de `post_clarification` next-action tanımlı; Order UI communication panel üzerinden gidiyor. Admin `/admin/messages` placeholder. |
| **Kanıt** | `RfqWorkspacePage.tsx`; `RfqClarificationPanel.tsx`; `order.next-actions.ts`; `routes/index.tsx` admin messages |
| **Etki** | Geliştirici ve destek ekibi hangi kanalı “doğru” sayacağını bilmez; çift audit izi riski |

### PCA-006 — Order workspace dikey yığılma (tek sayfa, çok modül)

| Alan | Değer |
|------|--------|
| **Önem** | **Medium** |
| **Sorun** | Order sayfası sırasıyla: header, PO özeti, communication, WHN, production, inspection, trade documents, FreightIQ + shipments, timeline, participants — hepsi full-width scroll. Sekme veya odak modu yok. |
| **Kanıt** | `OrderWorkspacePage.tsx` |
| **Etki** | “Fazla buton / fazla bilgi” hissi; üretim tarihi vs freight vs doküman aynı görsel öncelikte |

### PCA-007 — Timeline’lar ham `eventType` string

| Alan | Değer |
|------|--------|
| **Önem** | **Medium** |
| **Sorun** | Order (ve benzer pattern) timeline `{e.eventType} · {date}` — kullanıcı dostu etiket yok. RFQ timeline collapsed ve ayrı bileşen; tutarlılık düşük. |
| **Kanıt** | `OrderWorkspacePage.tsx` 237–243; `RfqTimeline` collapsed |
| **Etki** | “Timeline yeterince açıklayıcı mı?” → kısmen hayır; eğitim veya destek gerekir |

### PCA-008 — Control Tower PO deep-link eksik

| Alan | Değer |
|------|--------|
| **Önem** | **High** |
| **Sorun** | `OperationsPage.workspacePath()` PO tipini map’lemiyor; yalnızca RFQ, COMMODITYBID, ORDER, SHIPMENT. PO widget var, alert satırından PO workspace açılamayabilir. |
| **Kanıt** | `OperationsPage.tsx` 15–24 |
| **Etki** | Operations Journey: PO ile ilgili alert’lerde ekstra tıklama / manuel URL |

### PCA-009 — Trade Documents ve FreightIQ menüde yok, Order içinde gömülü

| Alan | Değer |
|------|--------|
| **Önem** | **Low** (bilinçli mimari olabilir) |
| **Sorun** | Kullanıcı mental modeli “FreightIQ / Trade Documents ayrı modül”; gerçekte Order/Shipment workspace alt bileşeni. Menüde ayrı entry yok. |
| **Kanıt** | `OrderWorkspacePage.tsx`; `ShipmentWorkspacePage.tsx` + `TradeDocumentsTab` |
| **Etki** | Navigation audit ile örtüşür — çoğu kullanıcı için doğru “workspace-centric” model; yeni kullanıcıda kafa karışıklığı |

### PCA-010 — Supplier CommodityBid davet listesi placeholder

| Alan | Değer |
|------|--------|
| **Önem** | **High** |
| **Sorun** | `/supplier/commoditybid` placeholder; CB workspace ve buyer listesi çalışıyor ama tedarikçi menüden CB bulamaz. |
| **Kanıt** | `routes/index.tsx` 78; buyer `/buyer/commoditybid` gerçek liste |
| **Etki** | Supplier Journey: “RFQ gör / teklif ver” RFQ’da iyi; CB yolu kırık |

### PCA-011 — E2E ve ürün gerçekliği uyumu iyi; keşif katmanı E2E dışı

| Alan | Değer |
|------|--------|
| **Önem** | **Low** |
| **Sorun** | 105+ E2E test workspace URL ve API üzerinden geçiyor; placeholder sayfalar test edilmiyor → prod’da “yeşil test / kırmızı UX” ayrımı. |
| **Kanıt** | `apps/e2e/tests/`; placeholder routes |
| **Etki** | Consolidation önceliklendirmesi test kapsamına list/index sayfaları eklenmeli |

---

## Modül olgunluk matrisi (konsolidasyon görünümü)

| Modül | Workspace | Liste / menü | Communication | CT entegrasyonu |
|-------|-----------|--------------|---------------|-----------------|
| RFQ | ✅ | ✅ buyer/supplier/admin RFQ | ✅ panel | ✅ funnel + alerts |
| CommodityBid | ✅ | ✅ buyer; ❌ supplier menü | ✅ panel | ✅ |
| PO | ✅ | ❌ menü | ✅ (PO workspace) | ⚠️ widget var, alert link yok |
| Order | ✅ | ❌ placeholder list | ✅ panel | ✅ |
| Shipment | ✅ | ❌ menü | ✅ panel | ✅ tracking ops |
| FreightIQ | ✅ (Order tab) | ✅ admin freight ops | ❌ forwarder dışarı (tasarım) | ✅ |
| Trade Documents | ✅ (Order/Shipment) | ❌ placeholder `/documents` | N/A | kısmi |
| Operations | ✅ `/operations` | N/A | ❌ `/admin/messages` placeholder | ✅ |

---

## Sonuç

Platform **iş mantığında** entegre; **ürün deneyiminde** hâlâ “workspace URL bilen power user” ile “menüden giden ithalatçı” arasında büyük uçurum var. Konsolidasyon sprint’i listeler, dashboard, PO_ISSUED→Order köprüsü ve menü–placeholder hizalamasına odaklanmalıdır.

**İlgili raporlar:** `navigation-audit.md`, `user-journey-audit.md`, `platform-lockin-audit.md`, `recommended-fixes.md`
