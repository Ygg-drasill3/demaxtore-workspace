# Navigation Audit

**Tarih:** 2026-06-03  
**Bağlam:** Bugün menüde RFQ, CommodityBid, Orders, Documents (+ Admin: Control Tower, Freight ops, Forwarders, …)  
**Kontrol soruları:** Menü sade mi? Aynı bilgi iki yerde mi? Kullanıcı kayboluyor mu?

---

## Mevcut menü envanteri

### Buyer (`NAV_BY_ROLE.BUYER`)

| Menü | Route | Gerçek sayfa? |
|------|-------|----------------|
| Dashboard | `/buyer/dashboard` | ✅ (MOCK veri) |
| RFQ Workspaces | `/buyer/rfq` | ✅ liste → `/workspace/rfq/:id` |
| CommodityBid | `/buyer/commoditybid` | ✅ liste |
| Orders | `/buyer/orders` | ❌ Placeholder |
| Documents | `/buyer/documents` | ❌ Placeholder |
| Notifications | `/notifications` | ✅ |

**Menüde yok:** PO, Order workspace, Shipment, FreightIQ, Trade Documents, Operations

### Supplier

| Menü | Route | Gerçek sayfa? |
|------|-------|----------------|
| Dashboard | `/supplier/dashboard` | ✅ (MOCK) |
| Assigned RFQs | `/supplier/rfq` | ✅ |
| CommodityBid Invites | `/supplier/commoditybid` | ❌ Placeholder |
| Orders | `/supplier/orders` | ❌ Placeholder |
| Documents | `/supplier/documents` | ❌ Placeholder |
| Notifications | `/notifications` | ✅ |

### Admin

| Menü | Route | Gerçek sayfa? |
|------|-------|----------------|
| Control Tower | `/operations` | ✅ |
| Freight ops | `/operations/freight` | ✅ |
| Forwarders | `/operations/forwarders` | ✅ |
| Dashboard | `/admin/dashboard` | ✅ (içerik sınırlı) |
| RFQs | `/admin/rfq` | ✅ liste |
| CommodityBids | `/admin/commoditybid` | ❌ Placeholder |
| Orders | `/admin/orders` | ❌ Placeholder |
| Suppliers | `/admin/suppliers` | ❌ Placeholder |
| Documents | `/admin/documents` | ❌ Placeholder |
| Notifications | `/notifications` | ✅ |
| Messages | `/admin/messages` | ❌ Placeholder |
| Settings | `/admin/settings` | ❌ Placeholder |

**Workspace URL’leri (menü dışı):** `/workspace/rfq|commoditybid|order|po|shipment/:id`

---

## Bulgular

### NAV-001 — Menü sade görünüyor ama %40+ ölü uç

| **Önem** | **Critical** |
|----------|--------------|
| **Sorun** | Buyer/Supplier için 6 menü öğesinden 2’si (Orders, Documents) işlevsiz. Admin’de 12 öğeden 5’i placeholder. Kullanıcı “kaybolmuyor” — **yanıltılıyor**. |
| **Kanıt** | `navigation.ts`, `routes/index.tsx` |
| **Öneri** | Ya implement et ya menüden kaldır / “Coming soon” tek yerde göster (`recommended-fixes.md` FIX-01) |

### NAV-002 — Aynı kavram, farklı giriş noktaları (RFQ vs Order vs PO)

| **Önem** | **High** |
|----------|----------|
| **Sorun** | Alıcı RFQ menüsünden başlar; PO ve Order ayrı workspace; menüde Order yok. PO_ISSUED RFQ’da kalır — zihinsel model “RFQ bitti mi devam mı?” |
| **Kanıt** | RFQ state `PO_ISSUED`; Order sadece spawn sonrası; PO link order panelinde |
| **Çift bilgi** | RFQ’da quotation + money summary; Order’da contract + PO özeti — kısmen doğru ayrım, geçiş eksik |

### NAV-003 — Documents çift yönlendirme

| **Önem** | **High** |
|----------|----------|
| **Sorun** | Sidebar “Documents” → placeholder. Gerçek dokümanlar: `RfqDocumentsPanel`, `TradeDocumentsTab` (Order/Shipment), PO workspace ekleri, communication attachments. |
| **Kanıt** | Placeholder routes; `TradeDocumentsTab` |
| **Kullanıcı kaybı** | “Dokümanları yükle” görevi için menü yanlış hedef |

### NAV-004 — Admin Control Tower vs ayrı admin listeler

| **Önem** | **Medium** |
|----------|----------|
| **Sorun** | Operasyon için asıl güç `/operations`; admin sidebar hâlâ RFQ list + boş Orders/CB/Suppliers. İki “komuta merkezi” izlenimi. |
| **Kanıt** | `OperationsPage.tsx` KPI + funnels + alerts; `/admin/rfq` ayrı liste |
| **Sadeleştirme** | Admin için tekincil liste sayfaları CT’ye fold edilebilir |

### NAV-005 — Messages vs Workspace Communication

| **Önem** | **Medium** |
|----------|----------|
| **Sorun** | Sprint 5E tüm workspace’lerde iletişim paneli; admin menüde “Messages” hâlâ placeholder — eski Sprint 2.9 beklentisi. |
| **Kanıt** | `WorkspaceCommunicationPanel`; `/admin/messages` placeholder |
| **Çift bilgi riski** | Gelecekte üçüncü bir “inbox” eklenirse lock-in zayıflar |

### NAV-006 — FreightIQ navigasyonu tutarlı (admin) / gizli (buyer)

| **Önem** | **Low** |
|----------|----------|
| **Sorun** | Buyer freight’i yalnızca Order workspace FreightIQ sekmesinden görür — menüde yok. Admin’de Freight ops + Forwarders açık. |
| **Değerlendirme** | Forwarder dışarıda kalma bilinçli ise ✅; buyer için “freight tekliflerini incele” Order’a bağımlı — kabul edilebilir workspace modeli |

### NAV-007 — Bildirimler tek ortak çıkış — iyi ama yetersiz tek başına

| **Önem** | **Medium** |
|----------|----------|
| **Sorun** | Workspace keşfi çoğunlukla `/notifications` deep-link’ine bağlı. Bildirim kaçırılırsa Order/Shipment bulunamaz. |
| **Kanıt** | Menüde workspace listesi yok; E2E’ler doğrudan URL kullanır |

### NAV-008 — Breadcrumb / üst seviye “neredeyim” zayıf

| **Önem** | **Low** |
|----------|----------|
| **Sorun** | Workspace header’da parent link (Order → RFQ/CB) var; global breadcrumb veya “My active deals” yok. |
| **Kanıt** | `OrderWorkspacePage` `order-parent-link`; Shipment benzer |

---

## Soru cevapları (Navigation Audit checklist)

| Soru | Cevap |
|------|--------|
| Menü sade mi? | **Görünüşte evet, fiilen hayır** — az öğe ama yarısı boş |
| Aynı bilgi iki yerde mi? | **Evet** — documents, messages (gelecek), RFQ money vs Order PO |
| Kullanıcı kayboluyor mu? | **Evet** — PO/Shipment/Order menü dışı; placeholder tıklanınca çıkmaz sokak |

---

## Önerilen bilgi mimarisi (konsolidasyon, kod yazmadan hedef)

```
Dashboard (canlı: open RFQs, orders, shipments, pending PO ack)
├── Sourcing: RFQ list | CommodityBid list
├── Execution: Orders list → Order workspace (PO, comm, docs, freight, shipments)
└── Notifications (deep links only — destekleyici)
```

Admin: **Control Tower birincil**; ikincil tam liste sayfaları CT widget’larından türetilsin.

**İlgili:** `platform-consolidation-audit.md` PCA-001, PCA-002; `recommended-fixes.md`
