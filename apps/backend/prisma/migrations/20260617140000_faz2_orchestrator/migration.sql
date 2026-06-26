-- Faz 2: orchestrator recommendations + control tower alert metadata
ALTER TABLE "control_tower_alerts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS "orchestrator_recommendations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "rule" TEXT,
    "mode" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orchestrator_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "orchestrator_recommendations_order_id_idx" ON "orchestrator_recommendations"("order_id");
CREATE INDEX IF NOT EXISTS "orchestrator_recommendations_shipment_id_idx" ON "orchestrator_recommendations"("shipment_id");
CREATE INDEX IF NOT EXISTS "orchestrator_recommendations_mode_idx" ON "orchestrator_recommendations"("mode");
