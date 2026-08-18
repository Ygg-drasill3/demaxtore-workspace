# Platform Lock-in Audit (Audit 5)

**Tarih:** 2026-06-03  
**En yüksek öncelikli denetim** — Her aşamada: *Kullanıcı neden WhatsApp’a (veya e-posta/telefon) geçsin?*

**Hedef:** Workspace Communication Layer (Sprint 5E) iş birliğini platformda tutar; keşif, bağlam ve güven eksikleri dış kanala iter.

---

## Değerlendirme ölçeği

| Skor | Anlam |
|------|--------|
| 🟢 **Güçlü kilitleme** | Aynı bağlamda mesaj + timeline + aksiyon; dış kanala gitmek veri kaybı |
| 🟡 **Kısmi** | Mesajlaşma var ama keşif/zaman çizelgesi/bildirim zayıf |
| 🔴 **Kaçış riski** | Kritik adım menü dışı, placeholder veya iletişim bağlamı yok |

---

## Aşama bazlı analiz

### RFQ

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | Acil deadline, tedarikçi platforma girmiyorsa |
| Platform karşılığı | 🟢 `WorkspaceCommunicationPanel` — QUESTION/ANSWER/DECISION; RFQ’da clarification panel kaldırıldı |
| Eksik | Tedarikçi telefon bildirimi / e-posta içeriğinde thread deep-link kalitesi (bildirim modülü ayrı denetim) |
| **Skor** | 🟢 **Güçlü** (kullanıcı zaten RFQ workspace’te) |

**PLI-001** | Low | Legacy `post_clarification` API hâlâ var — iki kanal riski operasyonel, son kullanıcı RFQ’da tek panel görür |

---

### CommodityBid

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | Çok tedarikçili pazarlık, hızlı fiyat |
| Platform | 🟢 Communication panel; 🟡 supplier menü CB placeholder — davet e-posta/WhatsApp ile gelir |
| **Skor** | 🟡 **Kısmi** (buyer iyi, supplier keşif zayıf) |

**PLI-002** | High | Supplier CB menü ölü — teklif sonrası iletişim platformda ama CB workspace URL’si dış kanaldan paylaşılır

---

### PO

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | “PO’yu onayla”, amendment tartışması |
| Platform | 🟢 PO workspace + communication; 🟡 menüde yok |
| **Skor** | 🟡 **Kısmi** |

**PLI-003** | High | PO tartışması için workspace var; kullanıcı PO’yu bulamazsa WhatsApp’ta PDF gönderir

---

### Order — üretim tarihi / durum

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | Üretim %, inspection, gecikme — günlük operasyonel konuşma |
| Platform | 🟢 Communication + production section; 🟡 `STATUS_UPDATE` tipi UI’da seçilebilir ama **rehber yok** |
| **Skor** | 🟡 **Kısmi** |

**PLI-004** | Medium | Mesaj atılabilir; structured production update ile comm birleşmiyor — WhatsApp hâlâ “hızlı güncelleme” kanalı

**PLI-005** | Critical | Order listesi yok — kullanıcı workspace’i açmadan comm katmanına erişemez → **telefon**

---

### Shipment — ETA değişti

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | ETA, customs, container — acil |
| Platform | 🟢 Communication panel + `ShipmentTrackingPanel`; tracking provider ayrı |
| İçeriden haberleşme? | **Evet** — buyer/supplier aynı shipment workspace |
| **Skor** | 🟢 **Güçlü** (workspace açıldığında) |

**PLI-006** | Medium | Shipment keşfi Order üzerinden — Order bulunamazsa ETA mesajı WhatsApp’ta

---

### FreightIQ — forwarder dışarıda

| Soru | Değerlendirme |
|------|----------------|
| Bilinçli mi? | ✅ Evet — forwarder platform dışı |
| Buyer–supplier freight? | Order FreightIQ tab — teklif karşılaştırma platformda |
| **Skor** | 🟢 **Tasarım gereği dışarı** — lock-in hedefi değil |

**PLI-007** | Low | Forwarder e-posta/PDF döngüsü normal; buyer-supplier freight kararı platformda kalmalı

---

### Trade Documents

| Soru | Değerlendirme |
|------|----------------|
| Neden WhatsApp? | BL/CI/PL hızlı paylaşım |
| Platform | 🟢 Order/Shipment tab; 🔴 menü Documents placeholder |
| **Skor** | 🟡 **Kısmi**

**PLI-008** | High | Dosya workspace’te; kullanıcı menüden Documents’a gidip boş sayfa görürse WhatsApp’a döner

---

### Operations / Admin

| Soru | Değerlendirme |
|------|----------------|
| Neden Slack/WhatsApp? | İç ekip koordinasyonu |
| Platform | CT alerts + workspace comm (admin participant ise); `/admin/messages` placeholder |
| **Skor** | 🟡 **Kısmi**

**PLI-009** | Medium | Admin tek inbox yok — ekip hâlâ paralel kanal kullanır (operasyonel, müşteri lock-in değil)

---

## Lock-in güç matrisi

| Aşama | Comm layer | Keşif | Timeline | Toplam |
|-------|------------|-------|----------|--------|
| RFQ | 🟢 | 🟢 | 🟡 | 🟢 |
| CommodityBid | 🟢 | 🟡 | 🟡 | 🟡 |
| PO | 🟢 | 🔴 | 🟡 | 🟡 |
| Order | 🟢 | 🔴 | 🔴 | 🔴 |
| Shipment | 🟢 | 🟡 | 🟡 | 🟡 |
| FreightIQ | N/A (forwarder dışı) | 🟡 | 🟡 | 🟢 (bilinçli) |
| Documents | N/A | 🔴 | 🟡 | 🔴 |

---

## Bulgular özeti

| ID | Önem | Bulgu |
|----|------|--------|
| PLI-005 | **Critical** | Order keşfi olmadan communication kullanılamaz |
| PLI-003 | **High** | PO workspace güçlü ama bulunamıyor |
| PLI-002 | **High** | Supplier CB menü kopuk |
| PLI-008 | **High** | Documents placeholder WhatsApp’a iter |
| PLI-004 | **Medium** | Üretim konuşması yapılandırılmamış comm |
| PLI-006 | **Medium** | Shipment Order’a bağımlı keşif |
| PLI-009 | **Medium** | Admin unified inbox yok |
| PLI-001 | **Low** | Legacy clarification API |
| PLI-007 | **Low** | Forwarder dışı — kabul |

---

## Sprint 5E sonrası net sonuç

**Communication Layer doğru yatırım** — RFQ ve açılmış Order/Shipment workspace’lerinde WhatsApp’a geçmek için *güçlü neden yok*.

**Asıl kilitleme düşmanı iletişim değil, keşif ve süreklilik:**

1. PO_ISSUED → Order köprüsü  
2. Orders / Documents listeleri  
3. Timeline okunabilirliği  
4. Dashboard’da “açık işler”  

Bu dörtü düzeltilmeden 5F özelliği lock-in’i artırmaz.

**İlgili:** `recommended-fixes.md` — öncelik FIX-01 … FIX-05 lock-in odaklı
