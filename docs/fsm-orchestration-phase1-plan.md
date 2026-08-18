# Faz 1 (P0) — Kritik Temel Düzeltmeler

**Önkoşul:** [Faz 0 Keşif Raporu](./fsm-orchestration-phase0-discovery.md) onaylandı  
**Hedef:** İstisna state'leri, idempotency, HMAC webhook iskeleti, migration planı, unit testler  
**Faz 2'ye geçiş:** Bu fazın tüm testleri yeşil + migration PR merge edilmiş olmalı

---

## PR Stratejisi

| PR | İçerik | Risk |
|----|--------|------|
| PR-1a | Contracts: yeni state'ler + geçişler + testler | Düşük |
| PR-1b | Idempotency hardening (FSM + processed_events tablosu) | Orta |
| PR-1c | HMAC webhook middleware + payment + carrier iskelet | Orta |
| PR-1d | In-flight migration script + runbook | Yüksek — ayrı deploy |

---

## 1.1 İstisna State'leri

### Karar: DISPUTED vs EXCEPTION

- **Order:** `DISPUTED` kalır; `open_dispute` / `resolve_dispute_*` korunur
- **Shipment:** `EXCEPTION` kalır; `report_exception` / `resolve_exception` korunur
- **Yeni:** Her iki FSM'e `REJECTED`, `PARTIALLY_DELIVERED` eklenir
- Faz 2 orchestrator'da cross-entity dispute senkronu ele alınır

### Order FSM (`packages/contracts/src/order.fsm.ts`)

Yeni state'ler:
- `REJECTED` — terminal
- `PARTIALLY_DELIVERED` — aktif (kısmi teslimat sonrası devam veya dispute)

Önerilen geçişler:

| From | To | Action | Roles | Event |
|------|-----|--------|-------|-------|
| `ANY_ACTIVE` | `REJECTED` | `reject_order` | BUYER, ADMIN | Kalite/belge red, tedarikçi red |
| `ARRIVED_PORT` | `PARTIALLY_DELIVERED` | `mark_partially_delivered` | BUYER, ADMIN | Kısmi teslimat onayı |
| `PARTIALLY_DELIVERED` | `DELIVERED` | `mark_delivered` | BUYER, ADMIN | Kalan miktar teslim |
| `PARTIALLY_DELIVERED` | `DISPUTED` | `open_dispute` | BUYER, SUPPLIER, ADMIN | Mevcut dispute akışı |
| `PARTIALLY_DELIVERED` | `CLOSED` | `close_order` | BUYER, ADMIN | Kısmi kabul + settlement |

`ORDER_TERMINAL_STATES` → `CLOSED`, `CANCELLED`, `REJECTED`  
`ORDER_ACTIVE_STATES` → `PARTIALLY_DELIVERED` ekle

### Shipment FSM (`packages/contracts/src/shipment.fsm.ts`)

Yeni state'ler:
- `REJECTED` — terminal (gümrük/red/redelivery imkansız)
- `PARTIALLY_DELIVERED` — aktif

Önerilen geçişler:

| From | To | Action | Roles | Event |
|------|-----|--------|-------|-------|
| `ANY_ACTIVE` | `REJECTED` | `reject_shipment` | BUYER, ADMIN | Hasar/red |
| `READY_FOR_DELIVERY` | `PARTIALLY_DELIVERED` | `confirm_partial_delivery` | BUYER, ADMIN | Kısmi teslim |
| `PARTIALLY_DELIVERED` | `DELIVERED` | `confirm_delivery` | BUYER, ADMIN | Kalan teslim |
| `PARTIALLY_DELIVERED` | `EXCEPTION` | `report_exception` | BUYER, SUPPLIER, ADMIN | Mevcut exception |

`SHIPMENT_TERMINAL_STATES` → `COMPLETED`, `CANCELLED`, `REJECTED`

### Propagasyon dosyaları

- `packages/contracts/src/order.next-actions.ts`
- `packages/contracts/src/shipment.next-actions.ts`
- `packages/contracts/src/order.fsm.test.ts`
- `packages/contracts/src/shipment.fsm.test.ts`
- `apps/backend/src/modules/order/order.preconditions.ts` — gerekirse `assertPartialDeliveryPayload`
- `apps/backend/src/modules/shipment/shipment.preconditions.ts`
- `apps/backend/src/modules/order/order.service.ts` — side effects
- `apps/backend/src/modules/shipment/shipment.service.ts` — side effects
- `apps/backend/src/modules/order/order.routes.ts` + controller
- `apps/backend/src/modules/shipment/shipment.routes.ts` + controller
- Frontend: `OrderActionDrawer`, shipment workspace action UI
- i18n: yeni `titleKey` çevirileri

---

## 1.2 Idempotency Hardening

### Mevcut durum

- Order/Shipment: `idempotencyKey` header → `auditLog` lookup (replay)
- Eksik: aynı state'te tekrar transition no-op; webhook event-id dedup

### Yapılacaklar

**A) Same-state no-op**

`order.service.ts` ve `shipment.service.ts` içinde `resolve*TargetState` sonrası:

```typescript
if (newState === currentState && !isSelfLoopAction(action)) {
  return existingResultOrMinimalReplay;
}
```

Self-loop aksiyonlar (`upload_document`, `report_production_progress`, `ready_delivery`) hariç tutulur.

**B) `processed_events` tablosu (Prisma migration)**

```prisma
model ProcessedEvent {
  id          String   @id @default(uuid())
  source      String   // "webhook:carrier", "webhook:payment", "fsm:order", "fsm:shipment"
  eventId     String   // provider event id veya idempotencyKey
  workspaceId String?
  action      String?
  processedAt DateTime @default(now())
  payload     Json?

  @@unique([source, eventId])
  @@index([workspaceId])
}
```

**C) `lib/processed-event.ts` helper**

- `claimEvent(source, eventId)` → true = işle, false = no-op (zaten işlendi)
- FSM `applyTransition` başında `idempotencyKey` varsa `claimEvent("fsm:order", key)` çağır

**D) Tracking dedup genişletme**

`tracking.service.ts`: dup check'e `rawPayload.externalEventId` ekle (provider destekliyorsa)

### Testler

- `packages/contracts/src/` — FSM geçiş testleri
- `apps/backend/src/modules/order/order.service.idempotency.test.ts` (yeni)
- `apps/backend/src/modules/shipment/shipment.service.idempotency.test.ts` (yeni)
- `apps/backend/src/lib/processed-event.test.ts` (yeni)

---

## 1.3 HMAC Webhook İmza Doğrulaması

### `apps/backend/src/middleware/webhook-signature.ts`

```typescript
verifyHmacSha256(rawBody: Buffer, signature: string, secret: string): boolean
```

- Header: `X-Demaxtore-Signature` veya provider-specific (`X-Webhook-Signature`)
- Timing-safe compare (`crypto.timingSafeEqual`)
- Doğrulama başarısız → 401 + structured log (IP, path, reason)

### Payment webhook (`payment.routes.ts`)

- `express.raw({ type: 'application/json' })` route-level
- `env.PAYMENT_WEBHOOK_SECRET` — yoksa dev'de skip, prod'da reject
- Stub provider'a geçmeden önce imza kontrolü

### Carrier iskelet (`apps/backend/src/modules/tracking/webhook.routes.ts`)

```
POST /api/webhooks/carrier/:provider
```

- HMAC doğrulama (`CARRIER_WEBHOOK_SECRET` veya per-provider secret map)
- Body parse → `ProcessedEvent` claim → log only (Faz 4'te FSM bağlanır)
- Sahte imza → 401 test

### Env (`apps/backend/src/config/env.ts`)

```
PAYMENT_WEBHOOK_SECRET: z.string().optional()
CARRIER_WEBHOOK_SECRET: z.string().optional()
```

---

## 1.4 In-Flight Migration Planı

### Kapsam

Aktif (`CLOSED`/`CANCELLED`/`COMPLETED` dışı) ORDER ve SHIPMENT workspace kayıtları.

### State mapping (yeni state eklenmez, sadece tutarlılık)

Mevcut kayıtlar için yeni `REJECTED`/`PARTIALLY_DELIVERED` state'ine otomatik geçiş yok. Migration sadece:

1. **Audit:** Desync raporu üret
   - Order `SHIPMENT_BOOKED` + Shipment `SHIPMENT_CREATED` (booking yapılmamış)
   - Order `IN_TRANSIT` + Shipment `BOOKING_CONFIRMED` (ciddi lag)
   - Order `DELIVERED` + Shipment `IN_TRANSIT` (ters desync)

2. **Metadata:** `workspaces.metadata.fsmVersion = 1` stamp (Faz 6 versiyonlama için)

3. **Script:** `apps/backend/scripts/fsm-migration-audit.mjs`
   - Read-only rapor JSON çıktısı
   - `--apply-metadata` flag ile metadata stamp (opsiyonel)

### Runbook

1. Staging'de audit script çalıştır
2. Desync listesini ops ile gözden geçir
3. Production'da read-only audit
4. Metadata stamp (downtime gerekmez)
5. Faz 1 deploy sonrası Control Tower'da yeni `ORDER_SHIPMENT_STATE_MISMATCH` alert (opsiyonel, Faz 1 sonu)

---

## 1.5 Unit Test Seti

| Senaryo | Dosya |
|---------|-------|
| Çift `idempotencyKey` → tek transition | `order.service.idempotency.test.ts` |
| Çift webhook event-id → no-op | `webhook-signature.test.ts` |
| Sahte HMAC → 401 | `webhook-signature.test.ts` |
| `REJECTED` geçiş kuralları | `order.fsm.test.ts`, `shipment.fsm.test.ts` |
| `PARTIALLY_DELIVERED` geçiş kuralları | aynı |
| Same-state duplicate action no-op | service idempotency tests |

Çalıştırma:

```bash
yarn workspace @dmx/contracts test
yarn workspace @dmx/backend test -- --testPathPattern="idempotency|webhook-signature|fsm"
```

---

## Uygulama Sırası

1. Contracts + FSM testleri (PR-1a)
2. `processed_events` migration + idempotency helper (PR-1b)
3. Order/Shipment service no-op + idempotency entegrasyonu (PR-1b)
4. HMAC middleware + payment + carrier iskelet (PR-1c)
5. Migration audit script + runbook (PR-1d)
6. E2E smoke: mevcut `06-shipment-flow.spec.ts` regresyon

---

## Faz 1 Tamamlanma Kriterleri

- [ ] `REJECTED`, `PARTIALLY_DELIVERED` her iki FSM'de tanımlı ve testli
- [ ] Çift event/idempotencyKey no-op doğrulandı
- [ ] Payment webhook HMAC zorunlu (prod)
- [ ] Carrier webhook iskeleti + HMAC + processed_events dedup
- [ ] Migration audit script staging'de çalıştı
- [ ] Mevcut E2E shipment flow regresyonu geçti

Onay sonrası Faz 1 implementasyonuna **yalnızca PR-1a** ile başla.
