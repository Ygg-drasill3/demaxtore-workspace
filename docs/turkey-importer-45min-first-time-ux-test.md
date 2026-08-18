# 45-Minute First-Time Turkey Importer UX Test

**Date:** 2026-08-17  
**Mode:** Mystery shopper — no coaching, no code, no production mutation  
**Persona:** Türkiye’de ithalat yapan, teknik olmayan dış ticaret / lojistik yöneticisi  
**Starting assets:** URL + demo login only  
**Account used:** Login page **Türk İthalatçı** demo (`Türk İthalatçı User Test` / BUYER)  
**Product context:** `docs/turkey-importer-product-definition.md`  
**Code changed:** NO

---

## Session method

Cursor acted as a first-time Turkish importer. Tasks were given as jobs, not click paths. Screens were observed as they appeared. No feature was “taught.” No friction was fixed during the session.

---

## First 60 seconds

Login page headline is:

> “The Import Operating System for **Companies Sourcing From Turkey**.”

Feature list is RFQ, CommodityBid, Inspection, Live Shipment Tracking.

That is the **International sourcing** story, not “Çin’den Türkiye’ye ithalat + navlun + gümrük.”

A Türk ithalatçı doğal olarak **TR** ve **Türk İthalatçı** demosuna basar. TR, form dilini Türkçeleştirir; sol pazarlama paneli İngilizce kalır. Giriş sonrası workspace yine **EN** açılır.

**Friction F1 — dakika 1 — login**  
Beklenen: Türkiye’ye ithalat işletim sistemi.  
Görülen: Türkiye’den tedarik pazarlaması.  
Tereddüt: “Bu benim işim mi, yoksa ihracatçı / sourcing ürünü mü?”

---

## Task log

### Task 1 — “Önümüzdeki ay Çin’den ithalat yapacağım. Nasıl başlarım?”

**Ne yaptı kullanıcı:** Login → dashboard → kahraman alandaki **Start import**.

Dashboard ilk bakışta doğru hikâyeyi söylüyor:

- “Manage freight, customs and your import journey in one place.”
- CTA: **Get freight quote** + **Start import**
- Sol menü: Import Operations önce (My Imports, Freight, Shipments, Customs, Deliveries, Landed Cost)

`/buyer/imports/new` anlaşılır:

- “I have a supplier” → Create Purchase Order
- “I need a freight quote” → Request Freight Quote
- Typical journey: PO → Freight → Shipment → Customs → Delivery → Landed cost
- Ops notu açık: teklif yayını ve broker ataması DeMaxtore Operations

**Verdict: PASS**  
Kullanıcı mimariyi bilmeden “bir sonraki ithalatımı başlatıyorum” modeline ulaşabiliyor.

---

### Task 2 — “Bu ithalat için navlun almak istiyorum.”

**Ne yaptı kullanıcı:** Start import → “I need a freight quote”.

`/buyer/freightiq/request` açıldı. Tek kart:

- `DEMO-PO-UTEST-TR-001`
- Durum: **FREIGHT SELECTED**
- Turuncu uyarı: **“This order cannot accept a new freight quote.”**
- Tek aksiyon: Open order

Yeni Çin ithalatı için navlun yolu burada **kapanıyor**. Sistem “önce PO oluştur” demiyor. Kullanıcı geri dönüp “I have a supplier” kartını hatırlamak zorunda.

Ops bağımlılığı metinde var (“Operations will coordinate forwarders”) — bu bug değil. Ama **sonraki adım** yeni iş için belirsiz.

**Verdict: FRICTION**  
Navlun keşfedildi; yeni iş başlatılamadı.

**Friction F2 — dakika ~8 — freight request**  
Beklenen: Çin ithalatı için teklif iste.  
Görülen: Mevcut sipariş teklif kabul etmiyor; alternatif CTA yok.

---

### Task 3 — “Aktif ithalatımdan birinin durumunu anlayayım.”

**Ne yaptı kullanıcı:** Sol menü **My Imports**.

Kart çok güçlü:

- Rota: ITGOA → TRMER
- Badge: **In customs**
- Freight: In Transit
- Customs: Broker Review
- Delivery: Not Started
- **NEXT: Documents / Readiness**
- Linkler: Open shipment / Customs / Landed cost

Bu, Import OS vaadinin en net ekranı.

Aynı anda dashboard KPI’ları çelişiyor: hero “0 in transit”, kart “2 active imports / 1 in customs”, shipment “IN TRANSIT”.

**Verdict: PASS** (anlaşılır) + sayı çelişkisi friction

**Friction F3 — dashboard vs My Imports sayıları tutarsız**

---

### Task 4 — “Konteyner / sevkiyat bilgilerini bul.”

**Ne yaptı kullanıcı:** Open shipment.

Shipment workspace merkezi ve zengin:

- Durum: In transit, %60, Booking ✓ Pickup ✓
- What happens next: “Monitor ETA and prepare import documents”
- ETA: **—**
- Map: “4 SHIPS / PREVIEW” + gemi isimleri (Maersk / CMA / MSC)
- Disclaimer (aşağıda): simulated, not live GPS
- **Booking: No booking created.**
- **Containers: No containers.**
- Container number: —
- Link tracking disabled
- PO satırı görünür: Durum wheat pasta 12.000
- Breadcrumb: UUID `31362445-296e-4e74-8976-dc2886210c50`

Kullanıcı sevkiyatı bulur. Konteyner numarası yoktur. Harita GPS gibi durur; uyarı ancak aşağı kayınca çıkar. “In transit” ile “No booking / No containers” aynı anda durur.

**Verdict: FRICTION**  
Shipment comprehension kısmen var; container visibility yok.

**Friction F4 — harita canlı görünüyor, veri boş**  
**Friction F5 — In transit + no booking + no container**  
**Friction F6 — UUID breadcrumb (teknik kullanıcı değil)**

---

### Task 5 — “Dikkat gerektiren bir problem var mı?”

Kullanıcı iki “dikkat” yüzeyine gider:

**Import Control Tower**

- “Operations Command Center”
- 0 missing docs, 0 critical exceptions
- **Attention Required: No immediate actions required.**
- Pipeline: 1 RFQ, 0 PO, 0 Booking, 0 Shipment
- International sourcing boru hattı (RFQ → Supplier selection → …)

**Exceptions / Alert Hub**

- Open alerts 0
- “No exceptions match your filters.”

Aynı anda:

- My Imports NEXT = Documents / Readiness
- Customs **Needs Attention**, NOT READY
- Documents **16 missing**
- Dashboard Priority actions: mesaj + PO acknowledgement

Kullanıcı “sorun var mı?” diye Control Tower / Exceptions’a bakarsa cevap **hayır**. Gerçek operasyonel sorun **Customs + Documents**’ta.

**Verdict: FRICTION** — keşif yolu var, güven yok.

**Friction F7 — Control Tower / Exceptions gerçek dikkat sinyaliyle çelişiyor (kritik)**

---

### Task 6 — “Bu shipment’ın belgelerini bul.”

İki yer:

1. Shipment içi Trade documents: CI / PL / BOL **Missing + Upload**
2. Sidebar **Documents**: Unified Document Center, 16 missing, entity = bu shipment/order

Belgeler bulunur. İsimler teknik (`EXPORT_DECLARATION v1`). Aynı evrak order + shipment olarak **çift listelenir**. Missing satırda **Preview** vardır — kullanıcı tıklayınca ne göreceğini bilemez. POD listede yok (teslimat başlamadığı için).

**Verdict: PASS** (bulundu) with terminology friction

**Friction F8 — 16 missing çift kayıt + teknik doküman adları**

---

### Task 7–8 — “Gümrük durumu ve eksik olan ne?”

Sidebar **Customs** → Needs Attention varsayılan.

Satır: NOT READY + BROKER REVIEW + declaration not filed.

Case sayfası ürün vaadini en iyi taşıyan ikinci ekran:

- “Not a government filing system”
- Readiness: **NOT READY · 2 blocking · 4 warnings**
- CI FAIL, PL FAIL, BOL WARNING
- GTİP / origin / product master WARNING
- Broker assigned PASS
- Duty & Tax: “Estimation only — not official”; unknown sıfır değil
- Activity: “Pilot demo — gümrük dosyası oluşturuldu”

Buyer üzerinde broker execution butonları da görünüyor (Start declaration, Place hold…). İthalatçı “ben mi basacağım, broker mı?” diye kalabilir.

URL UUID: `00000000-0000-0000-0000-00000000e104`

**Verdict: PASS** (durum + eksik evrak anlaşılır)  
Next-action: evrak yükle — shipment’ta net; customs case’te biraz ops/broker karışık.

---

### Task 9–10 — “Gümrükten sonra yurtiçi teslimat ve teslimat kanıtı”

**Deliveries / Inland:** “After customs clearance — trucker, pickup, POD. No GPS tracking.”  
Needs Attention filtresi boş: “No inland deliveries in this filter.”

Shipment üzerinde inland kartı daha iyi: “pickup requires CLEARED; you may still prepare a request.”

POD bu hesapta **yok** — teslimat oluşmadığı için. Kullanıcı Deliveries’te “kanıt nerede?” diye arar, boş tablo görür. Empty state POD’un *neden* olmadığını “CLEARED sonrası” diye bağlasa da, **Proof of Delivery** kelimesi tablo başlığında var, satır yok.

**Inland: FRICTION** (modül bulundu, bu ithalat görünmüyor)  
**POD: FAIL** (bu session’da kanıt nesnesi yok; kullanıcı “yok çünkü gümrük bitmedi” çıkarımını kendi yapmak zorunda)

---

### Task 11 — “Bu ithalat bana neye mal oldu?”

**Landed Cost** listesi: “No landed cost calculations yet. Open a shipment and calculate.”  
Unknown ≠ zero metni doğru.

Shipment içinde **Calculate** butonu var. Liste boş olduğu için maliyet *anlaşılamaz*; sadece “henüz hesaplanmamış” anlaşılır.

**Verdict: FRICTION** — keşif var, rakam yok, self-service Calculate’e bağlı.

---

## Cross-transaction context

Aynı DEMO-UTEST-TR-001 hattı:

PO → Freight selected → Shipment in transit → Customs broker review / not ready → Inland not started → Landed cost not calculated

Kullanıcı **My Imports + Shipment workspace** ile bu hattı kaybetmeden gezebilir. Control Tower hattı **kaybeder** (RFQ pipeline, 0 shipment). Conversation Hub timeline boş; sayfa altındaki Timeline’da yalnızca “Shipment created”.

---

## Would this user explain DeMaxtore vs classic forwarder?

**Kısmen evet, kendi cümlesiyle şunu diyebilir:**

> “Navlun ve gümrük aynı yerde, ithalat kartında evrak ve sonraki adım görünüyor.”

**Şunu güvenle diyemez:**

> “Dikkat gerektiren her şey Control Tower’da çıkıyor.”  
> “Konteynerimi canlı görüyorum.”  
> “Teslimat kanıtı ve gerçek maliyet hazır.”

---

## Friction register

| ID | Dk | Ekran | İş | Beklenen | Görülen | Yanlış yer? | Tamamlandı mı? |
|----|----|-------|----|----------|---------|-------------|----------------|
| F1 | 1 | Login | Ürünü anla | TR ithalat OS | Sourcing from Turkey + RFQ | Hayır | Kısmen |
| F2 | 8 | Freight request | Yeni navlun | Teklif iste | Mevcut order kilitli | Hayır | Hayır |
| F3 | 5 | Dashboard | Durum | Tutarlı sayılar | 0 in transit vs IN TRANSIT | Hayır | Evet |
| F4 | 15 | Shipment map | Konum | Operasyonel durum | GPS gibi 4 gemi preview | Hayır | Kısmen |
| F5 | 16 | Shipment | Booking/container | Konteyner no | No booking / no containers | Hayır | Hayır |
| F6 | 14 | Breadcrumb | Nerede olduğumu bil | İnsan okunur ID | UUID | Hayır | Evet |
| F7 | 25 | Control Tower + Exceptions | Problem var mı? | Attention | Hepsi yeşil; gerçek sorun Customs/Docs | Evet — yanlış yeşil | Yanıltıcı |
| F8 | 28 | Documents | Evrak | Bu shipment’ın evrakı | 16 missing, çift, teknik ad | Hayır | Evet |
| F9 | 22 | Hub Timeline | En son ne oldu? | Kronoloji | No entries; alt timeline 1 event | Hayır | Kısmen |
| F10 | 32 | Inland | Teslimat/POD | Gümrük sonrası hattı | Boş tablo | Hayır | Hayır |
| F11 | 1+ | Language | TR kullan | TR kalır | Login TR, app EN | Hayır | Hayır |

---

## USER EXPERIENCE VERDICT

First-Time Product Comprehension:
FRICTION

Start Import Discoverability:
PASS

Freight Quote Discoverability:
FRICTION

Active Import Visibility:
PASS

Shipment / Container Comprehension:
FRICTION

Control Tower Comprehension:
FRICTION

Exception Discoverability:
FRICTION

Document Discoverability:
PASS

Customs Discoverability:
PASS

Customs Readiness Comprehension:
PASS

Inland Delivery Discoverability:
FRICTION

POD Discoverability:
FAIL

Landed Cost Discoverability:
FRICTION

Cross-Transaction Context:
FRICTION

Next-Action Clarity:
FRICTION

Classic Forwarder Differentiation Understood:
PARTIAL

Freight + Customs + Import OS Proposition Understood:
PARTIAL

Unassisted Tasks Completed:
7 / 11

Assistance Required:
4

Dead Ends:
3

Critical UX Blockers:
1

Total Friction Events:
11

Top 5 Frictions:
1. Control Tower ve Exceptions “sorun yok” derken Customs/Documents “NOT READY / 16 missing” diyor — dikkat katmanı güvenilmez.
2. Login ve Control Tower hâlâ International sourcing (RFQ/CommodityBid/Türkiye’den tedarik) anlatıyor; dashboard/Start Import Turkey hikâyesini anlatıyor.
3. Shipment “in transit” ama booking yok, container yok, ETA boş; harita canlı GPS gibi duruyor.
4. Yeni navlun isteği mevcut order’da kilitleniyor; Çin ithalatı için sonraki adım yok.
5. Inland/POD/Landed cost bu ithalat için boş — kullanıcı “yok mu, henüz değil mi, yanlış yerde miyim?” diye kalıyor.

Most Valuable Feature According to User:
My Imports kartı (Freight / Customs / Delivery / Next) ve Customs Readiness (hangi evrak eksik).

Most Confusing Feature:
Import Control Tower (komuta merkezi gibi duruyor, Türkiye ithalat gerçekliğini göstermiyor).

Would User Understand Why DeMaxtore Is Different From A Classic Forwarder?
PARTIAL

Would User Be Comfortable Giving DeMaxtore Their Next Import?
MAYBE

FINAL 45-MINUTE UX VERDICT:
Türk ithalatçı eğitim almadan **Start Import, My Imports, Shipment, Customs ve Documents** ile “navlun + gümrük + ithalat hattı” vaadini kısmen anlar; ama Control Tower/Exceptions yeşil ışık yakarken evrak/gümrük kırmızı olduğu, sevkiyatın konteynersiz “in transit” göründüğü ve teslimat/maliyetin boş kaldığı için 45 dakikanın sonunda sistemi **klasik forwarder + WhatsApp’ın net üstü** olarak kendi cümlesiyle satamaz — **eşlikli pilot demo hâlâ gerekli**, kendi başına keşif yeterli değil.

---

## Development note

Bu rapor gözlem + kanıttır. Session sırasında kod yazılmadı. Friction’lar otomatik Sprint 44 listesi değildir. Önceliklendirme ayrı bir karardır.

**Recommended Immediate Development from this UX test alone:** NONE unless product owner elevates F7 (contradictory attention) as a sales-trust issue before Customer #1 unassisted login.
