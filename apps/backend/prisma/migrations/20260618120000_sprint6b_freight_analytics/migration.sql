-- Sprint 6B — Freight analytics (margin policies + commercial snapshots)

CREATE TABLE IF NOT EXISTS "freight_margin_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "route_pattern" TEXT,
  "country_from" TEXT,
  "country_to" TEXT,
  "default_margin_usd" DECIMAL(18,4) NOT NULL,
  "min_margin_usd" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "max_margin_usd" DECIMAL(18,4) NOT NULL DEFAULT 10000,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "freight_margin_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "freight_margin_policies_is_active_idx" ON "freight_margin_policies"("is_active");
CREATE INDEX IF NOT EXISTS "freight_margin_policies_country_from_country_to_idx" ON "freight_margin_policies"("country_from", "country_to");

CREATE TABLE IF NOT EXISTS "freight_commercial_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "period" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "forwarder" TEXT NOT NULL,
  "shipment_count" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "margin" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "freight_commercial_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "freight_commercial_snapshots_period_idx" ON "freight_commercial_snapshots"("period");
CREATE INDEX IF NOT EXISTS "freight_commercial_snapshots_route_idx" ON "freight_commercial_snapshots"("route");
CREATE INDEX IF NOT EXISTS "freight_commercial_snapshots_forwarder_idx" ON "freight_commercial_snapshots"("forwarder");
