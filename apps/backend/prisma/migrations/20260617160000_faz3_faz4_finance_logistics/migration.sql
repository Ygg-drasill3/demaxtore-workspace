-- Faz 3/4: payment milestones + carrier event records
CREATE TABLE IF NOT EXISTS "payment_plans" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_plans_order_id_key" ON "payment_plans"("order_id");

CREATE TABLE IF NOT EXISTS "payment_milestones" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_milestones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_milestones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "payment_plans"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "payment_milestones_plan_id_kind_idx" ON "payment_milestones"("plan_id", "kind");

CREATE TABLE IF NOT EXISTS "payment_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_event_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_order_id_external_event_id_key" ON "payment_events"("order_id", "external_event_id");
CREATE INDEX IF NOT EXISTS "payment_events_order_id_processed_at_idx" ON "payment_events"("order_id", "processed_at");

CREATE TABLE IF NOT EXISTS "payment_holds" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "plan_id" UUID,
    "reason" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    CONSTRAINT "payment_holds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_holds_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "payment_plans"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "payment_holds_order_id_active_idx" ON "payment_holds"("order_id", "active");

CREATE TABLE IF NOT EXISTS "carrier_event_records" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "shipment_id" UUID,
    "confidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "raw_payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carrier_event_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_event_records_provider_external_event_id_key" ON "carrier_event_records"("provider", "external_event_id");
CREATE INDEX IF NOT EXISTS "carrier_event_records_shipment_id_status_idx" ON "carrier_event_records"("shipment_id", "status");
