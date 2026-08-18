# User Journey Audit

**Tarih:** 2026-06-03  
**Denetimler:** Audit 1 Buyer · Audit 2 Supplier · Audit 3 Operations  
**Her adımda sorulan sorular:** Sonraki aksiyon açık mı? Fazla buton? Eğitim gerekir mi? Timeline açıklayıcı mı? Communication panel doğru yerde mi?

---

## Audit 1 — Buyer Journey (gerçek ithalatçı simülasyonu)

| Adım | Platform durumu | Sonraki aksiyon | Fazla buton | Eğitim | Timeline | Communication |
|------|-----------------|-----------------|-------------|--------|----------|---------------|
| **1. RFQ oluştur** | ✅ `/buyer/rfq` → create → workspace; WHN + primary CTA güçlü | ✅ Net | Düşük | Düşük | RFQ timeline collapsed — orta | RFQ altında full-width panel ✅ |
| **2. Teklifleri incele** | ✅ `QuotationComparisonPanel`, money summary | ✅ `select_supplier` / evaluation states | Orta (çok panel) | Orta (state isimleri İngilizce) | Orta | Soru-cevap communication’da ✅ |
| **3. Tedarikçi seç** | ✅ FSM + picker’lar | ✅ WHN yönlendirir | Düşük | Düşük | İyi (state labels) | ✅ |
| **4. PO oluştur** | ✅ `issue_po` picker; PO workspace spawn | ⚠️ PO sonrası RFQ `PO_ISSUED` — order CTA kırık (PCA-003) | Düşük | Orta (PO vs RFQ ayrımı) | RFQ terminal copy iyi | RFQ’da hâlâ konuşulabilir ✅ |
| **5. Order takip et** | ⚠️ Menü Orders placeholder; workspace URL veya bildirim gerekir | ⚠️ Order WHN var ama keşif zayıf | **Yüksek** — tek sayfada 8+ bölüm | **Yüksek** — production vs freight vs docs | **Zayıf** — ham eventType | ✅ Order’da communication üst sıralarda |
| **6. Doküman yükle** | ✅ `TradeDocumentsTab` Order/Shipment içinde | ⚠️ Menü Documents placeholder yanıltır | Orta | Orta (hangi workspace?) | Doküman olayları timeline’da okunaksız olabilir | Ekler communication’da mümkün |
| **7. Freight tekliflerini incele** | ✅ Order → FreightIQ tab | ✅ Order state’e bağlı aksiyonlar | Orta (Freight + shipment list aynı kart) | Orta | Maritime ayrı panel | Forwarder platform dışı — bilinçli |
| **8. Shipment takip et** | ✅ Order’dan shipment linkleri; Shipment workspace | ✅ Shipment WHN + tracking panel | Düşük–orta | Orta (tracking vs comm) | Orta | ✅ Shipment communication |

### Buyer bulguları

| ID | Önem | Bulgu |
|----|------|--------|
| **UJA-B01** | Critical | Orders menüsü çalışmıyor — “takip” adımı menüden tamamlanamaz (PCA-001) |
| **UJA-B02** | Critical | PO_ISSUED → Order workspace geçişi belirsiz / kırık CTA (PCA-003) |
| **UJA-B03** | High | Dashboard MOCK — açılışta “ne yapmalıyım” yanıt vermez |
| **UJA-B04** | High | Documents menüsü yanlış — eğitim gerektirir (“aslında Order’a git”) |
| **UJA-B05** | Medium | Order sayfası bilişsel yük — üretim tarihi konuşması communication’da mümkün ama `STATUS_UPDATE` tipi rehberlenmiyor |
| **UJA-B06** | Medium | RFQ timeline collapsed; Order timeline teknik string |
| **UJA-B07** | Low | CommodityBid buyer listesi iyi; RFQ ile paralel sourcing — iki giriş bilinçli eğitim ister |

**Buyer journey skoru:** **6/8 adım** workspace derinliğinde güçlü; **2/8** (Order keşfi, PO sonrası köprü) kritik boşluk.

---

## Audit 2 — Supplier Journey (gerçek tedarikçi simülasyonu)

| Adım | Platform durumu | Ne yapacağını anlıyor mu? | Gereksiz admin bilgisi? | Çok fazla ekran? |
|------|-----------------|---------------------------|-------------------------|------------------|
| **1. RFQ gör** | ✅ `/supplier/rfq` + workspace; quote form `RFQ_OPEN` | ✅ WHN + quote form | Hayır | Hayır |
| **2. Teklif ver** | ✅ `SupplierQuoteForm` | ✅ | Hayır | Hayır |
| **3. Teklif revize et** | ✅ FSM revise (state’e bağlı) | Orta — hangi state’te revize açık | Hayır | Hayır |
| **4. PO kabul et** | ⚠️ PO workspace veya Order üzerinden `PoSummaryPanel`; menüde PO yok | **Zayıf** — “PO nerede?” | Hayır | Orta (RFQ + PO + Order) |
| **5. Doküman yükle** | ✅ Trade docs Order/Shipment; RFQ attachments panel | Orta | Hayır | Orta |
| **6. Order ilerlet** | ⚠️ `/supplier/orders` placeholder | **Zayıf** | Hayır | Evet — RFQ, PO, Order ayrı URL |
| **7. Shipment bilgisi** | ✅ Order’dan link; supplier shipment actions state’e bağlı | Orta | Hayır | Orta |

### Supplier bulguları

| ID | Önem | Bulgu |
|----|------|--------|
| **UJA-S01** | Critical | Supplier Orders listesi yok — aktif işler görünmez |
| **UJA-S02** | High | CommodityBid invites menüsü placeholder — CB yolunda kopukluk |
| **UJA-S03** | High | PO acknowledgement için tek net yer PO workspace; keşif zayıf |
| **UJA-S04** | Medium | Supplier dashboard MOCK — pending quotation sayısı güvenilmez |
| **UJA-S05** | Medium | RFQ workspace’te buyer-only paneller (quotation comparison) supplier için gizlenmiş ✅ — admin leakage yok |
| **UJA-S06** | Low | Aynı communication panel pattern — öğrenme eğrisi bir kez |

**Supplier soruları:**

| Soru | Cevap |
|------|--------|
| Supplier ne yapacağını anlıyor mu? | **RFQ aşamasında evet**; PO/Order aşamasında **hayır** (keşif) |
| Gereksiz admin bilgisi görüyor mu? | **Hayır** — rol ayrımı iyi |
| Çok fazla ekran mı? | **Evet** — RFQ → PO workspace → Order → Shipment zinciri URL tabanlı |

---

## Audit 3 — Operations Journey (Admin — 20 RFQ / 15 Order / 10 Shipment / 50 Alert simülasyonu)

**Not:** UI’da toplu seed yok; Control Tower API ve DB ölçeklenebilir. Simülasyon kod incelemesi + CT `limit: 50` + funnel widget yapısına dayanır.

| Senaryo | Gözlem |
|---------|--------|
| **20 RFQ** | `/admin/rfq` list + CT RFQ funnel metrikleri; workspace başına alert üretilebilir |
| **15 Order** | Admin Orders placeholder — **toplu order triage menüden yapılamaz**; CT funnel + alert list |
| **10 Shipment** | CT `useShipmentTrackingOps`; alert link → shipment workspace |
| **50 Alert** | Frontend `useControlTowerAlerts` **limit: 50** — tam 50 görünür, sayfalama/filtre UI sınırlı; kritik filtre üst blokta |

### Operations bulguları

| ID | Önem | Bulgu |
|----|------|--------|
| **UJA-O01** | High | Admin Orders/CB/Suppliers placeholder — operasyon “Excel’e kaçma” riski order/supplier taramasında |
| **UJA-O02** | Medium | 50+ alert’te limit 50 — kalan alert görünmez (sayfa yok) |
| **UJA-O03** | Medium | Alert resolve tek tek; toplu işlem yok |
| **UJA-O04** | Low | CT realtime socket — iyi; KPI + funnel + SLA + PO widget tek sayfada ✅ |
| **UJA-O05** | High | PO alert’lerinde workspace deep-link eksik (PCA-008) |

### Operations checklist

| Soru | Cevap |
|------|--------|
| Control Tower yeterli mi? | **Kısmen evet** — KPI, funnel, critical strip, SLA, freight ops iyi |
| En kritik işler görünür mü? | **Evet** — `critical` filtreli blok |
| Operasyon Excel’e ihtiyaç duyar mı? | **Evet, bugün** — order/supplier toplu listeleri ve export yok; alert >50 için de Excel/pivot cazip |

**Operations journey skoru:** CT **güçlü görünürlük**; **zayıf toplu işlem ve admin listeler**.

---

## Communication panel konumu (çapraz journey)

| Workspace | Konum | Değerlendirme |
|-----------|--------|---------------|
| RFQ | Quotations altında, timeline üstü | ✅ Alıcı–tedarikçi soru-cevap için doğru |
| Order | Header sonrası, WHN öncesi | ✅ Üretim/ETA tartışması için erken erişim |
| Shipment | Üst bölümlerde | ✅ ETA değişikliği için uygun |
| PO | PO workspace içinde | ✅ Ack/amendment bağlamı |
| CommodityBid | Benzer RFQ | ✅ |
| FreightIQ | Panel yok (Order tab only) | ✅ Forwarder dışı tasarım |

---

## Özet tablo (tüm journey’ler)

| Önem | Sayı | Örnek ID |
|------|------|----------|
| Critical | 4 | UJA-B01, UJA-B02, UJA-S01, (PCA-003) |
| High | 7 | UJA-B03, UJA-S02, UJA-O01, … |
| Medium | 8 | UJA-B05, UJA-O02, … |
| Low | 3 | UJA-B07, UJA-O04, … |

**İlgili:** `platform-lockin-audit.md`, `recommended-fixes.md`
