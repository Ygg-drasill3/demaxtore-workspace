# DeMaxtore Turkey Importer — Ürün Tanımı ve 45 Dakikalık Kullanıcı Deneyimi Test Bağlamı

Bu belge yazılımcıya **ürün bağlamı**dır. Hangi butona basılacağını öğretmez. Türk ithalatçı olarak DeMaxtore’un ne olduğunu, hangi işleri yapabilmesi gerektiğini ve sistemin mantığını anlatır.

İlgili UX testi: mystery shopper / first-time user. Test sırasında kod yazılmaz, friction kaydedilir.

---

## 1. DeMaxtore Türk İthalatçı Ürünü Nedir?

DeMaxtore’un Türkiye ithalatçı ürünü, klasik bir freight forwarder müşteri portalı değildir.

Ticari modelin merkezinde iki gerçek lojistik hizmeti vardır:

1. Navlun / Freight Forwarding
2. Gümrük operasyonu / Customs

Bu iki hizmet, DeMaxtore’un geliştirdiği Import Operating System ile desteklenir.

Temel değer önerisi:

> Türk ithalatçı navlununu ve gümrük operasyonunu DeMaxtore ile yönetirken, ithalat işleminin tamamını tek bir dijital çalışma ortamından takip edebilmeli ve yönetebilmelidir.

DeMaxtore yalnızca müşteriye bir navlun fiyatı veren veya shipment status gösteren bir sistem değildir.

Amaç, bir ithalat işleminin mümkün olduğunca aynı operasyonel bağlam içerisinde ilerlemesidir:

Product / PO → Freight → Booking → Shipment → Container → Tracking → Customs → Inland Delivery → POD → Landed Cost

Bunun üzerinde de yatay operasyon katmanları bulunur:

Control Tower · Exceptions · Timeline · Documents

---

## 2. Türk İthalatçı Sisteme Girdiğinde Ne Görmeli?

Türk ithalatçı hesabı `TURKEY_IMPORTER` operating model ile çalışır.

International Buyer deneyimi bundan ayrıdır. International Buyer tarafındaki mevcut Sourcing, RFQ, CommodityBid, Inspection, Timeline, Shipment Tracking, Alerts / Exceptions, Document Hub yetenekleri korunmuştur.

Turkey Importer için ana ticari hikâye:

> Freight + Customs + Import Operating System

Türk ithalatçı sisteme giriş yaptığında ilk bakışta şunları anlayabilmelidir:

- Yeni bir ithalat başlatabilirim.
- Navlun teklifi isteyebilirim.
- Aktif ithalatlarımı görebilirim.
- Shipment'larımı takip edebilirim.
- Gümrük sürecimi görebilirim.
- Yurtiçi teslimatı takip edebilirim.
- Dokümanlarıma ulaşabilirim.
- Dikkat gerektiren operasyonları görebilirim.
- İthalat maliyetimi görebilirim.

Sistem kullanıcının eski sourcing özelliklerini kaldırmaz; ancak Turkey Importer için bunlar ana ticari giriş noktası değildir.

---

## 3. Start Import — İthalatın Başlangıcı

Türk ithalatçı için başlangıç noktalarından biri **Start Import** olmalıdır.

Amaç müşterinin teknik domain modelini bilmesini gerektirmeden gerçek bir ithalat işlemini sisteme başlatabilmesidir.

Kullanıcı mevcut operasyon bağlamına göre Direct PO oluşturabilir, ithalat sürecini başlatabilir, uygun sipariş için freight quote sürecine ilerleyebilir.

Kullanıcıya “önce sistemin bütün modüllerini öğren” yaklaşımı uygulanmamalıdır.

Ürün mümkün olduğunca şu zihinsel modele uymalıdır:

> “Bir sonraki ithalatımı DeMaxtore ile başlatıyorum.”

---

## 4. Product Master ve Purchase Order

İthalat operasyonunun ticari bağlamı ürün ve satın alma siparişinden başlayabilir.

Product Master ürün/SKU bilgisini tutar. Purchase Order ithal edilen malların ticari işlem bağlamını oluşturur. PO içerisindeki ürün satırları daha sonraki shipment ve allocation işlemleriyle ilişkilendirilebilir.

DeMaxtore yalnızca “ABC konteyneri Shanghai'dan geliyor” bilgisini tutmak istemez.

Hedef daha derin bir lineage'dır:

> Hangi ürün → hangi PO → hangi shipment → hangi container → hangi customs işlemi → hangi teslimat → hangi maliyet?

---

## 5. Freight — Navlun Teklifi

Navlun, DeMaxtore'un temel gelir alanlarından biridir.

Türk ithalatçı Workspace içerisinden navlun sürecine ulaşabilmelidir.

Ana ticari CTA: **Get Freight Quote**

Kullanıcı uygun order/ithalat işlemi için navlun talebi oluşturabilmelidir.

Operasyon kontrollü pilot modelinde tamamen self-service değildir. Teklif hazırlama/yayınlama, operasyonel freight handoff, booking öncesi kontroller, deposit süreçleri Ops desteği gerektirebilir.

Bu bir bug olarak değerlendirilmemelidir. Mevcut ticari model **assisted / managed import operation** modelidir.

Ancak kullanıcı açısından süreç anlaşılır olmalı; kullanıcı bir sonraki adımın ne olduğunu görebilmelidir.

---

## 6. Freight Offer ve Booking

Freight request sonrasında uygun teklif oluşturulur. Müşteri teklifi değerlendirir/seçer. Ardından booking operasyonu başlar.

Booking, shipment'a dönüşen operasyonel zincirin önemli aşamasıdır. Bu noktadan sonra sistem yalnızca fiyat alma aracı olmaktan çıkar ve gerçek lojistik execution sürecine geçer.

---

## 7. Shipment Workspace

Shipment Workspace, Import OS'nin en önemli çalışma yüzeylerinden biridir.

Bir shipment açıldığında kullanıcı mümkün olduğunca aynı bağlam içerisinde şunlara ulaşabilmelidir:

freight bilgisi, booking bağlamı, shipment durumu, container, tracking/milestones, timeline, documents, customs, inland delivery, landed cost.

Kullanıcının her bilgi için bağımsız sistemler veya UUID'ler araması beklenmemelidir.

Shipment, ithalat operasyonunun merkezi operational object'lerinden biridir.

---

## 8. Container & Shipment Visibility

Mevcut sistemde shipment tracking yapısı, tracking snapshots, milestone görünürlüğü, timeline bağlantıları bulunmaktadır.

Mevcut production deployment'taki tracking provider **manual/simulated** yapıdadır. Gerçek Maritime data provider entegrasyonu ayrıca devreye alınacaktır.

Kullanıcı testinde mevcut sistemi gerçek GPS/AIS feed'iymiş gibi değerlendirmeyin.

Test edilmesi gereken mevcut UX:

> Kullanıcı shipment/container'ın operasyonel durumunu anlayabiliyor mu ve tracking bilgisinin ithalatın geri kalanıyla ilişkisini görebiliyor mu?

Tracking'in uzun vadeli mimari amacı yalnızca haritada bir gemi göstermek değildir. Tracking verisinin Tracking → Timeline → Exceptions → Control Tower zincirini beslemesi hedeflenmektedir.

---

## 9. Timeline

Timeline, kullanıcının shipment/ithalat sürecinde ne olduğunu kronolojik olarak anlayabilmesini sağlar.

Amacı müşterinin farklı kişilerden “En son ne olmuştu?” diye bilgi toplamak zorunda kalmasını azaltmaktır.

Mevcut audit'e göre Timeline işlevsel bir capability'dir ancak bütün domain'ler henüz tek kusursuz event stream altında birleşmiş değildir.

Testte özellikle:

> Kullanıcı Timeline'a baktığında ithalat işleminin geçmişini anlamlandırabiliyor mu?

---

## 10. Control Tower

Control Tower'ın amacı kullanıcının veya Ops ekibinin yalnızca bütün shipment'ları liste halinde görmesi değildir.

Esas soru:

> “Hangi operasyon şu anda dikkat gerektiriyor?”

Audit: L3 — actionable operations. Yalnız dashboard değildir. Operasyonel attention bilgisi sağlar ve ilgili execution yüzeylerine ilerlemeye yardımcı olur.

İdeal zihinsel akış: Attention → Problem → Context → Action → Resolution

45 dakikalık UX testinde:

> Kullanıcı Control Tower'ı açtığında bunun ne işe yaradığını yardım almadan anlayabiliyor mu?

---

## 11. Exceptions & Alerts

Structured exception/alert mekanizmaları vardır. Document, ETA/stale tracking, customs ve inland gibi alanlarda otomatik/yarı otomatik exception mekanizmaları bulunmaktadır. Severity ve resolution gibi structured özellikler vardır.

Bütün exception modelleri tamamen tek bir kusursuz lifecycle altında birleşmiş değildir. Proactive alerting bugün esas olarak in-workspace / in-app seviyesindedir. Email/webhook üzerinden eksiksiz otomatik escalation varmış gibi değerlendirilmemelidir.

UX testindeki temel soru:

> Kullanıcı bir sorun olduğunu anlayabiliyor mu, nedenini görebiliyor mu ve ne yapması gerektiğini bulabiliyor mu?

---

## 12. Document Hub / Trade Documents

Documents basit bir dosya deposu olarak tasarlanmamıştır. Belgeler operasyonel entity'lerle ilişkilendirilebilir ve özellikle customs readiness süreçlerinin parçası olabilir.

Commercial Invoice, Packing List, Bill of Lading, Customs documents, Inspection evidence, POD ve diğer Trade Documents operasyon bağlamında bulunabilir.

Belge erişimleri role/tenant izolasyonuna tabidir.

Testte özellikle:

> “Bu shipment'ın belgeleri nerede?”

sorusuna kullanıcının doğal biçimde cevap bulup bulamadığı ölçülmelidir.

---

## 13. Turkey Customs

Customs, Turkey Importer ürününün temel ticari parçalarından biridir. Yalnızca shipment'a yazılmış bir “customs status” alanı değildir. Sistemde customs execution workflow bulunmaktadır.

Customs Case, broker assignment, Broker Workspace, GTİP/classification workflow, document readiness, duty/tax visibility, clearance status gibi capability'ler bulunmaktadır.

Buyer'ın broker'ın teknik ID/UUID'sini bilmesi gerekmez.

---

## 14. Customs Document Readiness

Belgeler yalnız “download edilebilir PDF'ler” değildir. Document readiness customs operasyonuyla ilişkilidir.

> “Bu ithalat gümrük operasyonuna hazır mı?”

Broker execution ve document readiness arasında gerçek sistem bağlantısı bulunmaktadır. Bu Import OS'nin klasik shipment tracking portalından ayrıldığı önemli noktalardan biridir.

---

## 15. Duty & Tax

Duty & Tax görünürlüğü bulunmaktadır. Sistem resmi kamu vergi borcu sistemi değildir.

- Bilinmeyen değer sıfır gösterilmemeli
- Estimate/visibility resmi tahakkuk gibi sunulmamalı
- Kullanıcı yanlış kesinlik hissine sokulmamalıdır

**Unknown ≠ Zero** prensibi korunmalıdır.

---

## 16. Customs CLEARED Sonrası

İthalat gümrükten çıktığında DeMaxtore journey sona ermez.

Operasyon: CLEARED → Inland Delivery → Delivered → POD

İthalatçı açısından limandan/depotan kendi deposuna teslimat da aynı ithalat operasyonunun parçasıdır.

---

## 17. Inland Delivery

Customs clearance sonrasında inland delivery oluşturulabilir/yönetilebilir.

Ready for pickup, trucker assignment, delivery execution, delivered status gibi aşamalar bulunur. Buyer inland durumunu görebilir.

---

## 18. Trucker Workspace

Trucker'ın ayrı Partner Workspace'i bulunmaktadır. Atanmış trucker kullanıcı adı, şifre ve Partner Workspace ile kendisine atanmış delivery'yi bulabilmelidir. Manuel UUID veya direct API kullanması gerekmez.

Trucker yalnız kendisine ait operasyonel bilgileri görmelidir. Duty/tax, landed cost veya DeMaxtore internal margin gibi alanlar trucker'a açılmaz.

---

## 19. POD — Proof of Delivery

Delivery tamamlandığında POD, işlem lineage'ının parçası olabilir. POD yalnız “DELIVERED” yazısından farklıdır; teslimat kanıtıdır. POD Trade Documents/Document Hub bağlamında bulunabilir.

Amaç: Shipment → Customs → Inland → Delivered → POD zincirini aynı ithalat operasyonunda korumaktır.

---

## 20. Landed Cost

Amaç yalnızca “Konteyner nerede?” sorusuna değil, “Bu ithalat bana gerçekte neye mal oldu?” sorusuna da yaklaşmaktır.

Goods Value + Freight + Duty & Tax + Inland + mevcut diğer maliyetler = Landed Cost

Bilinmeyen değerler sıfır kabul edilmez. Landed Cost buyer tarafından görülebilir; internal margin veya partner buy-rate gibi DeMaxtore iç finansal bilgileri müşteriye açılmaz.

---

## 21. Multi-Party Operating Model

Aynı operasyon graph'ının farklı role göre çalışma yüzeyleri bulunmaktadır:

- **Buyer** — İthalatını görür ve müşteri aksiyonlarını gerçekleştirir.
- **DeMaxtore Admin / Ops** — Operasyonu koordine eder.
- **Supplier** — Kendi yetkili operasyonlarını yürütür.
- **Broker** — Kendisine atanmış customs case'ler üzerinde çalışır.
- **Trucker** — Kendisine atanmış inland delivery'leri yürütür.
- **Origin Agent** — Kendi partner operasyon alanında çalışır.

Amaç farklı operasyon taraflarının aynı ticari/lojistik gerçekliğin role-scoped görünümleri üzerinde çalışmasıdır.

---

## 22. Import OS'nin Temel Mantığı

Modülleri birbirinden bağımsız değerlendirmeyin.

Esas ürün hipotezi:

Product / PO → Freight → Booking → Shipment / Container → Tracking → Customs → Inland → POD → Landed Cost

Bunların üzerinde Control Tower; yatay olarak Timeline · Exceptions · Documents.

Kullanıcı deneyimi açısından başarı:

> Kullanıcının bu mimariyi bilmeden sistemi doğal şekilde kullanabilmesidir.

---

## 23. 45 Dakikalık Kullanıcı Deneyiminin Amacı

Bu çalışma bir regression test veya QA checklist değildir.

Kullanıcıya adım adım hangi butona basacağını söylemeyin.

Cursor mümkün olduğunca ilk kez DeMaxtore gören gerçek bir Türk ithalatçı gibi davranmalıdır.

Persona:

> Türkiye'de ithalat yapan bir şirketin ithalat/dış ticaret/lojistik yöneticisi. Çin veya başka bir origin'den düzenli konteyner getiriyor. Forwarder, gümrük müşaviri ve nakliyeciyle bugün ağırlıklı olarak e-posta, telefon, Excel ve WhatsApp üzerinden çalışıyor. Teknik kullanıcı değil.

Kullanıcının elinde başlangıçta yalnızca DeMaxtore URL + username + password olduğunu varsayın.

---

## 24. Test Boyunca Kullanıcıya Görevler Verin, Yol Tarif Etmeyin

Örnek görevler:

- “Önümüzdeki ay Çin'den bir ithalat yapacaksınız. DeMaxtore'da nasıl başlayacağınızı bulun.”
- “Bu ithalat için navlun almak istiyorsunuz.”
- “Aktif ithalatlarınızdan birinin ne durumda olduğunu anlamaya çalışın.”
- “Konteyner/sevkiyat bilgilerini bulun.”
- “Bu işlemde dikkat gerektiren bir problem olup olmadığını bulun.”
- “Shipment'ın belgelerini bulun.”
- “Gümrük işleminin durumunu öğrenin.”
- “Gümrük için eksik bir şey olup olmadığını anlamaya çalışın.”
- “Gümrükten çıktıktan sonra yurtiçi teslimatı bulun.”
- “Teslimat kanıtını bulun.”
- “Bu ithalatın maliyetini anlamaya çalışın.”

Her görevde kullanıcı davranışını gözlemleyin; çözümü önceden söylemeyin.

---

## 25. Özellikle Ölçülmesi Gereken UX Soruları

- **DISCOVERABILITY** — Kullanıcı doğru özelliği kendisi bulabildi mi?
- **COMPREHENSION** — Ekranın ne anlattığını anlayabildi mi?
- **NEXT ACTION CLARITY** — Bir sonraki adımın ne olduğunu anlayabildi mi?
- **TERMINOLOGY** — Freight, Customs, Import, Shipment, Exception, Landed Cost gibi terimler anlaşılır mı?
- **CONTEXT** — Kullanıcı hangi PO/shipment/import üzerinde çalıştığını kaybediyor mu?
- **NAVIGATION** — Bir işlemin parçaları arasında doğal geçiş yapabiliyor mu?
- **TRUST** — Sistem gerçek operasyon aracı hissi veriyor mu?
- **DEAD END** — Kullanıcı bir yerde ne yapacağını bilemeden kalıyor mu?
- **OPS DEPENDENCY** — Ops yardımı gereken yerde sistem bunu kullanıcıya anlaşılır biçimde anlatıyor mu?
- **VALUE PERCEPTION** — Kullanıcı DeMaxtore'un klasik forwarder portalından farkını anlayabiliyor mu?

---

## 26. Çok Önemli — Test Sırasında “Düzeltmeyin”

45 dakikalık session sırasında bir friction bulununca hemen kod yazılmamalıdır. Önce kaydedin.

Her friction için: dakika, ekran, kullanıcının yapmak istediği iş, ne beklediği, ne gördüğü, nerede tereddüt ettiği, yanlış yere gidip gitmediği, yardım isteyip istemediği, görevi tamamlayıp tamamlamadığı, kaç dakika kaybettiği.

UX testi → observation. Observation → evidence. Evidence → prioritisation. Ancak sonra development.

---

## 27. Testin Sonunda Cevaplanması Gereken Esas Soru

> İlk kez DeMaxtore'a giren gerçek bir Türk ithalatçı, eğitim almadan sistemin kendisine ne sunduğunu anlayıp bir ithalat operasyonunu başlatabilir, navlun/gümrük hizmetlerine ulaşabilir ve mevcut ithalatının durumunu uçtan uca anlamlandırabilir mi?

Ve ikinci soru:

> 45 dakika sonunda kullanıcı neden DeMaxtore ile çalışmanın klasik forwarder + gümrük müşaviri + Excel/WhatsApp modelinden daha iyi olduğunu kendi cümleleriyle açıklayabilir mi?

DeMaxtore'un vaat ettiği değişim:

Klasik model: Forwarder + Broker + Trucker + Excel + WhatsApp + E-mail + ayrı dokümanlar

↓

DeMaxtore: Freight + Customs + Import Operating System

ve tek ithalat journey'si: PO → Freight → Shipment → Customs → Delivery → POD → Landed Cost

Control Tower, Exceptions, Timeline ve Documents bu journey'nin operasyonel kontrol katmanını oluşturur.
