# Recommended Fixes — Platform Consolidation (Sprint 5F yerine)

**Tarih:** 2026-06-03  
**Prensip:** Yeni modül eklemeden mevcut workspace + communication + CT’yi **keşfedilir ve sürekli** hale getir.  
**Kaynak raporlar:** `platform-consolidation-audit.md`, `navigation-audit.md`, `user-journey-audit.md`, `platform-lockin-audit.md`

---

## Öncelik sırası (özet)

| Sıra | Fix | Önem | Lock-in etkisi | Tahmini efor |
|------|-----|------|----------------|--------------|
| 1 | FIX-01 Orders list (buyer + supplier + admin) | Critical | Yüksek | M |
| 2 | FIX-02 RFQ PO_ISSUED → spawned Order link | Critical | Yüksek | S |
| 3 | FIX-03 Menü–route hizalama (placeholder kaldır veya gizle) | Critical | Yüksek | S |
| 4 | FIX-04 Dashboard canlı “open work” | High | Yüksek | M |
| 5 | FIX-05 PO menü veya Execution hub | High | Orta–yüksek | S–M |
| 6 | FIX-06 CT PO alert deep-link | High | Orta (ops) | S |
| 7 | FIX-07 Supplier CommodityBid list | High | Orta | S |
| 8 | FIX-08 Timeline human labels | Medium | Orta | M |
| 9 | FIX-09 Order workspace sekmeler | Medium | Orta (UX) | M |
| 10 | FIX-10 Communication playbook (production ETA) | Medium | Orta | S |
| 11 | FIX-11 Legacy clarification deprecate | Medium | Düşük | M |
| 12 | FIX-12 CT alert pagination / severity filter | Medium | Ops | S |
| 13 | FIX-13 Admin Messages → CT comm filter veya kaldır | Low | Düşük | S |

**Efor:** S = küçük (1–2 gün), M = orta (3–5 gün)

---

## FIX-01 — Orders list API + sayfalar (Critical)

**Bulgular:** PCA-001, UJA-B01, UJA-S01, PLI-005, NAV-001

**Yapılacak:**
- `/buyer/orders`, `/supplier/orders`, `/admin/orders` için gerçek liste (state, counterparty, parent ref, son aktivite).
- Satır tıklanınca `/workspace/order/:id`.
- Filtreler: active / completed / pending PO ack.

**Kabul kriteri:** E2E: menüden Orders → workspace açılır; WhatsApp simülasyonu gerektirmez.

**Dokunulacak alanlar (tahmini):** `orders` backend list endpoint (varsa genişlet), yeni `OrdersListPage.tsx`, `routes/index.tsx`, `navigation.ts` (aynı kalır).

---

## FIX-02 — RFQ PO_ISSUED → Order köprüsü (Critical)

**Bulgular:** PCA-003, UJA-B02, PLI-003

**Yapılacak:**
1. Backend: `GET /api/rfq/:id/spawned-orders` (CommodityBid `spawned-orders` ile simetrik).
2. RFQ workspace `PO_ISSUED` bölümü: spawned order link listesi.
3. `WhatHappensNextCard`: `fallbackPrimary.href` varsa `Link` veya `navigate()` — boş `onPrimaryClick` yeterli değil.
4. `vars.orderId` WHN’e RFQ detail response’tan beslensin.

**Kabul kriteri:** PO issue sonrası tek tık Order workspace; E2E RFQ flow güncellenir.

---

## FIX-03 — Menü–route hizalama (Critical)

**Bulgular:** NAV-001, NAV-003, PCA-001

**Seçenek A (tercih):** FIX-01/07 ile placeholder’ları doldur.  
**Seçenek B:** Placeholder menü öğelerini kaldır; yalnızca çalışan rotalar sidebar’da.

**Kabul kriteri:** Hiçbir menü öğesi “Sprint 3” placeholder göstermez.

---

## FIX-04 — Dashboard canlı veri (High)

**Bulgular:** PCA-004, UJA-B03, UJA-S04

**Yapılacak:**
- MOCK kaldır; CT veya domain API’den: open RFQs, pending quotes, active orders, unread notifications count.
- “Next actions” kartı: en fazla 5 deep-link (RFQ WHN özeti veya alert özeti).

---

## FIX-05 — PO keşfi (High)

**Bulgular:** PCA-002, UJA-S03, PLI-003

**Seçenekler:**
- **A:** Buyer/Supplier menüye “Purchase Orders” (pending ack filtresi).
- **B:** Orders listesinde PO status kolonu + PO workspace link.
- CT `workspacePath` PO desteği (FIX-06 ile birlikte).

---

## FIX-06 — Control Tower PO deep-link (High)

**Bulgular:** PCA-008, UJA-O05

```typescript
// OperationsPage workspacePath — önerilen ek
PURCHASE_ORDER: "po",
```

Alert `workspaceType === 'PURCHASE_ORDER'` (veya contract’taki canonical tip) için link testi.

---

## FIX-07 — Supplier CommodityBid list (High)

**Bulgular:** PCA-010, UJA-S02, PLI-002

**Yapılacak:** `/supplier/commoditybid` → davet edildiği CB workspace listesi (buyer list pattern kopyası, supplier scope).

---

## FIX-08 — Timeline insan okunur etiketler (Medium)

**Bulgular:** PCA-007, UJA-B06

**Yapılacak:** `eventType` → i18n map (RFQ `state-labels` pattern); Order/Shipment/PO timeline bileşenlerinde ortak `formatTimelineEvent()`.

---

## FIX-09 — Order workspace sekmeler (Medium)

**Bulgular:** PCA-006, UJA-B05

**Önerilen sekmeler:** Overview (WHN + PO) · Communication · Production & QC · Documents · Freight & Shipments · Timeline

Aynı API; yalnızca layout — FSM/constraint değişmez.

---

## FIX-10 — Communication playbook (Medium)

**Bulgular:** PLI-004, UJA-B05

**Yapılacak (UX only):**
- Order communication composer’da bağlama ipuçları: “Production date change → Status update”.
- İlk kullanımda tek satırlık coach mark (bir kez localStorage).

---

## FIX-11 — Legacy clarification deprecate (Medium)

**Bulgular:** PCA-005, PLI-001

**Yapılacak:**
- `RfqClarificationPanel` kullanımını kaldır (zaten RFQ workspace’te yok).
- `post_clarification` next-action’ı UI’dan gizle; yeni mesajlar yalnızca workspace-communication API.
- Dokümante et: migration not for integrators.

**Kısıt:** FSM transition silinmez (constraint); yalnızca UI/API yönlendirmesi.

---

## FIX-12 — CT alert list pagination (Medium)

**Bulgular:** UJA-O02

**Yapılacak:** `limit` + cursor veya “Load more”; severity/workspaceType filtre UI.

---

## FIX-13 — Admin Messages menü (Low)

**Bulgular:** NAV-005, PLI-009

**Seçenek:** Menü öğesini kaldır veya “Workspace messages” olarak CT’ye yönlendir (cross-workspace search Sprint 6+).

---

## Yapılmaması gerekenler (Sprint 5F önerisi reddi)

| Öneri | Neden şimdi değil |
|-------|-------------------|
| Yeni chat/ERP modülü | 5E communication layer yeterli |
| Ayrı FreightIQ buyer menüsü | Order tab yeterli; önce keşif |
| Sprint 5F “feature” paketi | Lock-in keşif/fix ile artar, özellik ile değil |

---

## Bulgu → Fix eşlemesi

| Bulgu ID | Fix |
|----------|-----|
| PCA-001, NAV-001 | FIX-01, FIX-03 |
| PCA-002 | FIX-05 |
| PCA-003 | FIX-02 |
| PCA-004 | FIX-04 |
| PCA-005 | FIX-11 |
| PCA-006 | FIX-09 |
| PCA-007 | FIX-08 |
| PCA-008 | FIX-06 |
| PCA-010 | FIX-07 |
| PLI-005 | FIX-01, FIX-02 |
| PLI-008 | FIX-01, FIX-03 |

---

## Test planı (consolidation regression)

1. Mevcut 105 E2E — tam regresyon (değişiklik sonrası).
2. Yeni: `15-orders-discovery.spec.ts` — menü Orders → workspace.
3. Yeni: RFQ PO_ISSUED → order link (FIX-02).
4. CT: PO alert click → `/workspace/po/:id` (FIX-06).

---

## Karar özeti

| Soru | Cevap |
|------|--------|
| Sprint 5F yeni feature? | **Hayır** — önce bu fix paketi |
| Pilot için minimum? | FIX-01, FIX-02, FIX-03 |
| Lock-in için minimum? | FIX-01–04 + FIX-02 |
| Tam consolidation? | FIX-01–12 |

**Ürün hazırlık (mevcut):** Workspace derinliği pilot için yeterli; **keşif katmanı pilot için yetersiz** — yukarıdaki Critical fix’ler olmadan canlı ithalatçı menüden tam yolculuk yapamaz.
