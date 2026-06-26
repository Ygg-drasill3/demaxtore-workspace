-- Sprint 17A — FreightIQ Estimate Layer

CREATE TABLE IF NOT EXISTS "freight_estimates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trade_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "origin_country" TEXT NOT NULL,
  "origin_port" TEXT NOT NULL,
  "destination_country" TEXT NOT NULL,
  "destination_port" TEXT NOT NULL,
  "container_type" TEXT NOT NULL,
  "fob_value" DECIMAL(18,4) NOT NULL,
  "estimated_freight" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "estimated_cif_value" DECIMAL(18,4) NOT NULL,
  "estimated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_refreshed_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "freight_estimates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "freight_estimates_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "freight_estimates_trade_id_status_idx" ON "freight_estimates"("trade_id", "status");
CREATE INDEX IF NOT EXISTS "freight_estimates_trade_id_estimated_at_idx" ON "freight_estimates"("trade_id", "estimated_at");
CREATE INDEX IF NOT EXISTS "freight_estimates_expires_at_status_idx" ON "freight_estimates"("expires_at", "status");
