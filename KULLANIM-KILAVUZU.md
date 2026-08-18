# DeMaxtore — Alıcı (Buyer) Kullanım Kılavuzu

Bu kılavuz, alıcı olarak platformda ne yapmanız gerektiğini ve hangi sırayla ilerlemeniz gerektiğini anlatır.

**Giriş:** `/login/` → Alıcı hesabı veya demo butonu  
**Şifre (demo):** `Passw0rd!`

| Hesap | Ne için |
|-------|---------|
| `demo.buyer@demaxtore.com` | Dolu demo senaryosu (önerilen) |
| `buyer.utest@demaxtore.local` | Boş hesap — sıfırdan test |

---

## Genel akış

```
RFQ oluştur → Teklif al → Tedarikçi seç → Proforma onayla → PO kes
     → Sipariş takibi → Navlun seç → Sevkiyat takibi → Ticaret kapanır
```

Her adım bir **çalışma alanı (workspace)** içinde ilerler. Üstteki süreç çubuğu hangi aşamada olduğunuzu gösterir.

---

## Adım 0 — Giriş ve panele alışma

Giriş yaptıktan sonra sol menüyü tanıyın:

| Menü grubu | Ne işe yarar |
|------------|--------------|
| **Home** | Gelen kutusu + Dashboard |
| **Sourcing** | RFQ, CommodityBid, Mixed/Bulk Container |
| **Execution** | PO, Sipariş, FreightIQ, Sevkiyat, Control Tower |
| **Collaboration** | Mesajlar, Bildirimler |
| **Documents** | Belge merkezi, uyumluluk |

**İlk yapılacaklar:**
1. **Dashboard** (`/buyer/dashboard`) açın — bekleyen işlemler, aktif ticaretler, uyarılar burada
2. **Import Control Tower** (`/buyer/control-tower`) — tüm ithalat hattınızın kuş bakışı görünümü
3. **Messages** (`/messages`) — RFQ/sipariş bağlamlı konuşmalar

> Dashboard'daki "Action Inbox" (öncelikli işler) kutusuna her girişte bakın — yapmanız gereken bir sonraki adım genelde orada çıkar.

---

## Adım 1 — RFQ oluştur

**Menü:** Sourcing → **RFQs** → **New RFQ** (`/buyer/rfq/new`)

**Ne yapılır:**
1. RFQ başlığı ve açıklama girin
2. Ürün satırları ekleyin (ürün adı, miktar, birim, spesifikasyon)
3. Ticari koşulları belirleyin:
   - Incoterm (FOB, CIF vb.)
   - Para birimi
   - Ödeme koşulları
   - Son teklif tarihi
4. RFQ'yu **gönderin** (taslak → inceleme)

**Sonra ne olur:** DeMaxtore Operasyon RFQ'nuzu inceler, uygun tedarikçileri atar ve teklif dönemini açar.

**Kontrol:** `/buyer/rfq` listesinde RFQ durumunu görün. Durum "Tedarikçi daveti" veya "Teklifler" olana kadar bekleyin.

**Demo:** `DEMO-RFQ-ABC-001` — açık teklif döneminde, 4 kalem, 3 teklif mevcut.

---

## Adım 2 — Tedarik stratejisi (opsiyonel)

**Sayfa:** RFQ workspace → **Procurement Strategy** (`/workspace/rfq/:id/procurement-strategy`)

RFQ açılmadan önce veya sırasında iki yol seçebilirsiniz:

| Strateji | Ne zaman |
|----------|----------|
| **Direct RFQ** | Belirli tedarikçilerden özel teklif toplamak istediğinizde |
| **CommodityBid** | Emtia ürünlerde canlı rekabetçi ihale istediğinizde |

> Çoğu standart ithalat için Direct RFQ yeterlidir. CommodityBid ayrı bir modüldür (`/buyer/commoditybid`).

---

## Adım 3 — Teklifleri al ve karşılaştır

**Sayfa:** RFQ workspace (`/workspace/rfq/:id`)

**Ne yapılır:**
1. RFQ workspace'i açın — üstte süreç çubuğu görünür
2. **Tedarikçi aktivitesi** panelinde kimin davet edildiğini, kimin teklif verdiğini görün
3. **Teklifler** sekmesine geçin
4. Tedarikçileri karşılaştırın:
   - Birim fiyat
   - Toplam tutar
   - Termin (lead time)
   - Ödeme koşulları
   - Incoterm

**Dikkat:** En düşük fiyat her zaman en iyi seçim değildir. Termin, kalite ve ticari koşulları birlikte değerlendirin.

**Demo:** `DEMO-RFQ-ABC-001` workspace'inde 3 tedarikçi teklifini yan yana karşılaştırın.

---

## Adım 4 — Tedarikçi seç

**Sayfa:** RFQ workspace → Teklifler → **Select Supplier**

**Ne yapılır:**
1. Kazanan tedarikçiyi (veya kalem bazında farklı tedarikçileri — split award) seçin
2. Seçimi onaylayın

**Sonra ne olur:** Sistem proforma fatura talep eder. Tedarikçi proformayı yükler.

**Kontrol:** Süreç çubuğu "Değerlendirme" → "Proforma" aşamasına geçer.

---

## Adım 5 — Proforma incele ve onayla

**Sayfa:** RFQ workspace → **Proforma** paneli

**Ne kontrol edilir:**
- [ ] Tedarikçi kimliği ve şirket bilgileri
- [ ] Ürün kalemleri ve miktarlar
- [ ] Fiyatlar ve para birimi
- [ ] Incoterm ve teslimat koşulları
- [ ] Ödeme koşulları ve banka bilgileri
- [ ] Geçerlilik tarihi
- [ ] Ekler (sertifikalar vb.)

**Ne yapılır:** Proformayı onaylayın veya düzeltme talep edin.

**Sonra ne olur:** PO düzenleme aşaması açılır.

---

## Adım 6 — Satın alma emri (PO) kes

**Sayfa:** `/buyer/purchase-orders/create` veya RFQ workspace'ten PO oluştur

**Ne yapılır:**
1. PO kalemlerini kontrol edin (RFQ/proformadan otomatik gelir)
2. Ticari koşulları son kez doğrulayın
3. PO'yu **düzenleyin (issue)**

**Sonra ne olur:** Tedarikçi PO'yu onaylamak veya değişiklik talep etmek zorundadır (SLA içinde).

**Kontrol:** `/buyer/purchase-orders` listesinde PO durumunu izleyin.

**Demo:** `DEMO-PO-ABC-001` — makarna PO'su.

---

## Adım 7 — Sipariş takibi

**Sayfa:** `/buyer/orders` → Sipariş workspace (`/workspace/order/:id`)

Tedarikçi PO'yu onayladıktan sonra sipariş yürütme başlar.

**Sipariş yaşam döngüsü:**

```
Sipariş oluşturuldu → Tedarikçi onayladı → Üretim başladı
     → Üretim devam ediyor → Üretim tamamlandı
     → Denetim talep edildi → Denetim tamamlandı
     → Navlun talep edildi
```

**Ne yapılır (alıcı tarafı):**
1. Sipariş workspace'ini açın
2. Üretim ilerlemesini takip edin
3. Denetim sonuçlarını inceleyin
4. Navlun hazır olduğunda FreightIQ'ya geçin

**Demo:** `ORD-DEMO-RFQ-ABC-002-00000000` — navlun seçilmiş durumda.

---

## Adım 8 — Navlun seç (FreightIQ)

**Sayfa:** `/buyer/freightiq`

**Ne zaman:** Üretim tamamlandıktan (ve gerekirse depozito kaydedildikten) sonra açılır.

**Ne yapılır:**
1. FreightIQ panelinde navlun seçeneklerini görün
2. Rota, transit süresi ve maliyeti karşılaştırın
3. Navlun seçimini onaylayın

**Sonra ne olur:** Sevkiyat kaydı oluşur, takip başlar.

---

## Adım 9 — Sevkiyat takibi

**Sayfa:** `/buyer/shipments` → Sevkiyat workspace (`/workspace/shipment/:id`)

**Ne yapılır:**
1. Sevkiyat listesinden aktif sevkiyatı açın
2. Durumu izleyin: booking → yükleme → transit → varış
3. ETA sapması veya gecikme varsa **Exceptions** (`/exceptions`) paneline bakın

**Demo:** `SHP-ORD-DEMO-RFQ-ABC-002-00000000` — transitte (ITGOA → DEHAM).

**Trade 360°:** `/workspace/trade/:id` — RFQ'dan sevkiyata tüm zinciri tek ekranda görün.

---

## Adım 10 — Belgeler ve kapanış

**Sayfalar:**
- `/documents` — tüm belgeler
- `/buyer/trade-documents` — uyumluluk belgeleri
- `/workspace/trade/:id/documents` — ticaret belgeleri paneli

**Ne yapılır:**
1. Tedarikçinin yüklediği belgeleri inceleyin (proforma, packing list, sertifikalar)
2. Eksik belge varsa mesajla talep edin (`/messages`)
3. Teslimat doğrulandığında ticaret kapanır

---

## Alternatif yollar

Platformda RFQ dışında da tedarik başlatabilirsiniz:

### CommodityBid (canlı ihale)
**Menü:** Sourcing → **Commodity Bids** (`/buyer/commoditybid`)

Emtia ürünlerde (domates salçası, un vb.) tedarikçiler canlı teklif verir. RFQ'dan farklı olarak fiyat rekabeti anlık gerçekleşir.

**Demo:** `DEMO-CB-ABC-001`

### Mixed Container (karışık konteyner)
**Menü:** Sourcing → **Mixed Container** (`/buyer/mixed-container`)

Tek konteynere birden fazla tedarikçiden ürün koymak istediğinizde:
1. Katalogdan ürün seçin
2. Konteyner talebi oluşturun
3. Operasyon fiyatlandırır → teklif gelir → onaylayın

**Demo:** `DEMO-MC-ABC-001`

### Bulk Container (toplu konteyner)
**Menü:** Sourcing → **Bulk Container** (`/buyer/bulk-container`)

Tek ürün, büyük hacim (ör. 1 FCL un) için benzer akış.

**Demo:** `DEMO-BC-ABC-001`

---

## Günlük rutin — neye bakmalı?

Her girişte şu sırayı izleyin:

| # | Nereye | Ne arıyorsunuz |
|---|--------|----------------|
| 1 | Dashboard | Action Inbox — bekleyen onaylar |
| 2 | Control Tower | Risk, gecikme, SLA ihlali |
| 3 | Messages | Okunmamış mesajlar, tedarikçi soruları |
| 4 | Notifications | Sistem uyarıları |
| 5 | Exceptions | Kritik istisnalar |

---

## Demo turu (15 dakika)

Dolu senaryoyu hızlıca gezmek için:

1. `demo.buyer@demaxtore.com` ile giriş yap
2. Dashboard'u incele
3. **RFQs** → `DEMO-RFQ-ABC-001` aç → teklifleri karşılaştır
4. **RFQs** → `DEMO-RFQ-ABC-002` aç → PO/sipariş durumunu gör
5. **Import Control Tower** aç
6. **My Shipments** → transit sevkiyatı aç
7. **Messages** → konuşmaları kontrol et
8. **Trade workspace** aç (`/workspace/trade/:id`) — tüm zinciri gör

---

## Sık sorulan sorular

**RFQ gönderdim ama tedarikçi teklif veremiyor**  
Operasyon henüz RFQ'yu yayınlamamış veya tedarikçi atamamış olabilir. Durum "Teklifler" olana kadar bekleyin; acilse `/messages` üzerinden operasyonla iletişime geçin.

**FreightIQ açılmıyor**  
Üretim tamamlanmadan navlun seçimi açılmaz. Sipariş workspace'inde üretim durumunu kontrol edin.

**PO'yu tedarikçi onaylamadı**  
72 saat SLA vardır. Gecikme varsa Exceptions panelinde uyarı görünür. Mesajla tedarikçiye ulaşın.

**Split award (kalem bazında farklı tedarikçi) yapabilir miyim?**  
Evet. RFQ değerlendirme aşamasında farklı kalemleri farklı tedarikçilere atayabilirsiniz.

---

*Demo şifresi: `Passw0rd!` — Demo seed: `yarn demo:seed`*
