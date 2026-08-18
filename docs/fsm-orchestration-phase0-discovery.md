# Faz 0 — Order/Shipment FSM Keşif Raporu

**Tarih:** 2026-06-17  
**Durum:** Onaylandı — Faz 1'e geçiş için hazır  
**Kapsam:** Kod yazımı yok; envanter, bağımlılık haritası, entegrasyon noktaları

---

## 1. Order FSM Envanteri

Kaynak: `packages/contracts/src/order.fsm.ts`

### State'ler (17)

| Kategori | State'ler |
|----------|-----------|
| Aktif (15) | `ORDER_CREATED`, `SUPPLIER_CONFIRMED`, `PRODUCTION_STARTED`, `PRODUCTION_IN_PROGRESS`, `PRODUCTION_COMPLETED`, `INSPECTION_REQUESTED`, `INSPECTION_COMPLETED`, `FREIGHT_REQUESTED`, `SHIPMENT_BOOKED`, `DEPARTED`, `IN_TRANSIT`, `ETA_UPDATED`, `ARRIVED_PORT`, `DELIVERED` |
| Terminal (2) | `CLOSED`, `CANCELLED` |
| İstisna (1) | `DISPUTED` |

**Faz 1'de istenen ama bugün yok:** `REJECTED`, `PARTIALLY_DELIVERED`

### Lojistik geçiş özeti

```
FREIGHT_REQUESTED → SHIPMENT_BOOKED → DEPARTED → IN_TRANSIT ⇄ ETA_UPDATED → ARRIVED_PORT → DELIVERED → CLOSED
```

### Aksiyonlar ve tetikleyiciler

| Aksiyon | Kim | Not |
|---------|-----|-----|
| `spawn_from_rfq` / `spawn_from_commoditybid` | SYSTEM | Order doğumu |
| `supplier_confirm_order` | SUPPLIER | PO auto-ack tetikler |
| `confirm_sla_expired` | SYSTEM | ORDER_CREATED → DISPUTED |
| `start_production` … `mark_production_completed` | SUPPLIER | Üretim milestone |
| `request_inspection` / `skip_inspection` | BUYER, ADMIN | skip → shipment spawn |
| `record_inspection_result` | ADMIN | PASS/FAIL |
| `proceed_to_freight` | BUYER, ADMIN | shipment spawn |
| `book_shipment` | ADMIN | FREIGHT_REQUESTED → SHIPMENT_BOOKED |
| `mark_departed` | ADMIN | → DEPARTED; ardından SYSTEM `auto_to_in_transit` |
| `update_eta` | ADMIN | → ETA_UPDATED; ardından SYSTEM `auto_to_in_transit` |
| `mark_arrived` | ADMIN | IN_TRANSIT → ARRIVED_PORT |
| `mark_delivered` | BUYER, ADMIN | ARRIVED_PORT → DELIVERED |
| `close_order` | BUYER, ADMIN | DELIVERED → CLOSED |
| `open_dispute` | BUYER, SUPPLIER, ADMIN | ANY_ACTIVE → DISPUTED |
| `cancel_order` | BUYER, ADMIN | ANY_ACTIVE → CANCELLED |
| `resolve_dispute_close/cancel` | ADMIN | DISPUTED → CLOSED/CANCELLED |

**Order lojistik katmanı 6 state ile sınırlı** — konteyner, yükleme, gümrük detayı yok.

---

## 2. Shipment FSM Envanteri

Kaynak: `packages/contracts/src/shipment.fsm.ts`

### State'ler (16)

| Kategori | State'ler |
|----------|-----------|
| Aktif (13) | `SHIPMENT_CREATED` → `BOOKING_PENDING` → `BOOKING_CONFIRMED` → `CONTAINER_ASSIGNED` → `READY_FOR_PICKUP` → `PICKED_UP` → `AT_ORIGIN_PORT` → `LOADED_ON_VESSEL` → `IN_TRANSIT` → `ARRIVED_DESTINATION_PORT` → `CUSTOMS_CLEARANCE` → `READY_FOR_DELIVERY` → `DELIVERED` |
| Terminal (2) | `COMPLETED`, `CANCELLED` |
| İstisna (1) | `EXCEPTION` |

**Faz 1'de istenen ama bugün yok:** `DISPUTED`, `REJECTED`, `PARTIALLY_DELIVERED`

### Kritik aksiyonlar (tümü ADMIN-only)

`confirm_booking`, `assign_container`, `pickup_cargo`, `arrive_origin_port`, **`load_vessel`**, `depart_vessel`, `arrive_destination`, `start_customs`, `complete_customs`, `confirm_delivery`, `complete_shipment`

`load_vessel` geçişleri:
- `CONTAINER_ASSIGNED` → `LOADED_ON_VESSEL` (pickup/port atlanabilir)
- `AT_ORIGIN_PORT` → `LOADED_ON_VESSEL`
- Precondition: `assertVesselLoaded`

---

## 3. Order ↔ Shipment Bağımlılık Haritası

### Bağlantı noktaları (kod)

| Olay | Dosya | Ne oluyor |
|------|-------|-----------|
| Shipment doğumu | `apps/backend/src/modules/shipment/shipment.spawn.ts` | Order `skip_inspection` / `proceed_to_freight` → Shipment workspace + `spawnedFromId` |
| FreightIQ seçimi | `apps/backend/src/modules/freightiq/freightiq.service.ts` | Offer seçilince mevcut shipment yoksa spawn, varsa link |
| Parent referans | `shipmentWorkspace.orderWorkspaceId` | Shipment → Order geri bağlantı |
| Trade root | `apps/backend/src/modules/trade/trade.resolver.ts` | Unified trade view aggregation |

**Kritik bulgu: İki FSM arasında otomatik senkronizasyon YOK.** Shipment geçişleri Order'ı güncellemez; Order geçişleri Shipment'ı güncellemez.

### Kavramsal eşleme

| Order state | Beklenen Shipment karşılığı | Senkron? |
|-------------|----------------------------|----------|
| `FREIGHT_REQUESTED` | `SHIPMENT_CREATED` … `BOOKING_PENDING` | Kısmen — spawn anında oluşur ama Order state değişmez |
| `SHIPMENT_BOOKED` | `BOOKING_CONFIRMED` | **Hayır** |
| `DEPARTED` | `LOADED_ON_VESSEL` veya `IN_TRANSIT` | **Hayır** |
| `IN_TRANSIT` | `IN_TRANSIT` | **Hayır** |
| `ARRIVED_PORT` | `ARRIVED_DESTINATION_PORT` (+ customs) | **Hayır** |
| `DELIVERED` | `DELIVERED` | **Hayır** — farklı giriş state'leri |
| `CLOSED` | `COMPLETED` | **Hayır** — farklı terminal semantiği |

### Shipment'ta olup Order'da olmayan state'ler

`CONTAINER_ASSIGNED`, `READY_FOR_PICKUP`, `PICKED_UP`, `AT_ORIGIN_PORT`, **`LOADED_ON_VESSEL`**, `CUSTOMS_CLEARANCE`, `READY_FOR_DELIVERY`, `EXCEPTION`

### Control Tower desenkronizasyon uyarıları

- `FREIGHT_SELECTED_NO_SHIPMENT` — `freightiq-alerts.ts`
- `SHIPMENT_ETA_EXCEEDED`, `SHIPMENT_CUSTOMS_STUCK`, `SHIPMENT_EXCEPTION_OPEN` — `alert-engine.ts` `scanShipment`

**Order-Shipment state mismatch için doğrudan alert yok.**

---

## 4. Webhook / Tracking Entegrasyon Noktaları

### Mevcut webhook'lar

| Endpoint | Dosya | İmza doğrulama |
|----------|-------|----------------|
| `POST /api/payments/webhook` | `apps/backend/src/modules/payments/payment.routes.ts` | **YOK** |
| Carrier/forwarder webhook | — | **MEVCUT DEĞİL** |
| Shipment milestone webhook | — | **MEVCUT DEĞİL** |

### Maritime tracking (pull model)

| Bileşen | Dosya | Davranış |
|---------|-------|----------|
| Scheduler | `tracking.scheduler.ts` | `maritime_tracking_sync` — 60dk, `syncAllLinked()` |
| Service | `tracking.service.ts` | `linkTracking`, `syncShipment`, `getTracking` |
| Provider | `maritime-api.provider.ts` | Outbound HTTP + Bearer; manual fallback |
| Diff | `tracking.diff.ts` | `departed`, `arrived`, `delayDetected` |
| Contract | `packages/contracts/src/shipment-tracking.ts` | **"informational; no FSM"** |

### Tracking event tipleri

`shipment.vessel.departed`, `shipment.eta.updated`, `shipment.delay.detected`, `shipment.arrived.port`, `shipment.tracking.synced`, `shipment.tracking.linked`

### Tracking → FSM

**YOK.** Tracking sync snapshot/event, timeline, socket ve Control Tower alert üretir; `applyTransition` çağrılmaz.

### Event deduplication (mevcut)

| Katman | Mekanizma |
|--------|-----------|
| Tracking events | `eventType + occurredAt` dup check — `tracking.service.ts` |
| FSM transitions | Opsiyonel `idempotencyKey` → `auditLog.payload` — `order.service.ts`, `shipment.service.ts` |
| HTTP writes | `idempotency.ts` middleware — ayrı `idempotencyKey` tablosu |
| Webhook event-id | **Yok** |

---

## 5. Trade Documents Modülü Bağlantıları

Kaynak: `packages/contracts/src/trade-documents.ts`

### Belge yaşam döngüsü

`MISSING` → `REQUESTED` → `UPLOADED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `EXPIRED`

Compliance: `NOT_READY` → `PARTIALLY_READY` → `READY_FOR_SHIPMENT`

### Bağlı servisler

| Servis | Rol |
|--------|-----|
| `documents.service.ts` | CRUD + `applyDocumentAction` |
| `compliance-engine.ts` | Checklist hesaplama |
| `compliance.ts` | `assertShipmentCompletionAllowed` — **tek FSM kapısı** |
| `documents.policy.ts` | Rol bazlı erişim |
| `trade-documents-alerts.ts` | Control Tower scan |
| `document-center.service.ts` | Cross-workspace belge listesi |

### FSM entegrasyonu (bugün)

| Olay | FSM etkisi |
|------|------------|
| `approve_document` (B/L dahil) | **Yok** |
| `complete_shipment` | Compliance blok (ADMIN override mümkün) |
| Order/Shipment `upload_document` | Ayrı tablolar — Trade Documents'tan bağımsız |

---

## 6. İstisna State Gap (Faz 1 öncesi)

| State | Order | Shipment | Not |
|-------|-------|----------|-----|
| `CANCELLED` | Var | Var | Senkron değil |
| `DISPUTED` | Var | Yok (`EXCEPTION` var) | Farklı model |
| `REJECTED` | Yok | Yok | Faz 1 |
| `PARTIALLY_DELIVERED` | Yok | Yok | Faz 1 |
| `EXCEPTION` | Yok | Var | Shipment-only |

---

## 7. Doğrulanan Temel Sorunlar

1. **İkili FSM, sıfır orchestration** — lojistik adımlar iki kez manuel işaretleniyor
2. **Tracking bilgi katmanı** — FSM'i ilerletmiyor
3. **Webhook altyapısı yok** — carrier/forwarder push sıfırdan yazılacak
4. **Trade Documents izole** — B/L onayı lojistik state'i etkilemiyor
5. **Kısmi idempotency** — webhook/event-id dedup ve payment HMAC yok

---

## 8. Faz 1'e Geçiş Önkoşulları

- Bu rapor onaylandı
- Faz 1 planı: `docs/fsm-orchestration-phase1-plan.md`
- Faz 1 testleri yeşil olmadan Faz 2'ye geçilmez
- Migration adımları ayrı PR olarak izole edilir
