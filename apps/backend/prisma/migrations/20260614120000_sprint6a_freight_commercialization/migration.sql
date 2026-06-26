-- Sprint 6A — FreightIQ commercialization

ALTER TABLE "freight_offers"
  ADD COLUMN IF NOT EXISTS "internal_cost_usd" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "freightiq_margin_usd" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "display_price_usd" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "margin_locked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "margin_locked_by" UUID;

CREATE TABLE IF NOT EXISTS "freight_revenue_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id" UUID,
  "order_id" UUID NOT NULL,
  "freight_offer_id" UUID NOT NULL,
  "forwarder_cost_usd" DECIMAL(18,4) NOT NULL,
  "freightiq_margin_usd" DECIMAL(18,4) NOT NULL,
  "display_price_usd" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "realized_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "freight_revenue_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "freight_revenue_ledger_shipment_id_idx" ON "freight_revenue_ledger"("shipment_id");
CREATE INDEX IF NOT EXISTS "freight_revenue_ledger_order_id_idx" ON "freight_revenue_ledger"("order_id");
CREATE INDEX IF NOT EXISTS "freight_revenue_ledger_created_at_idx" ON "freight_revenue_ledger"("created_at");
CREATE INDEX IF NOT EXISTS "freight_revenue_ledger_status_idx" ON "freight_revenue_ledger"("status");

-- Backfill display_price from legacy price column
UPDATE "freight_offers"
SET
  "display_price_usd" = COALESCE("display_price_usd", "price"),
  "internal_cost_usd" = COALESCE("internal_cost_usd", "price")
WHERE "display_price_usd" IS NULL OR "internal_cost_usd" IS NULL;
