-- Sprint 15D — Buyer Exception Hub projection layer
CREATE TABLE IF NOT EXISTS "trade_exceptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "alert_id" UUID,
  "trade_root_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "workspace_type" TEXT,
  "exception_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "owner_id" UUID,
  "owner_role" TEXT,
  "required_action" TEXT,
  "due_date" TIMESTAMPTZ,
  "resolution_eta" TIMESTAMPTZ,
  "resolution_note" TEXT,
  "assigned_at" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "closed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trade_exceptions_alert_id_key" ON "trade_exceptions"("alert_id") WHERE "alert_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "trade_exceptions_trade_root_id_idx" ON "trade_exceptions"("trade_root_id");
CREATE INDEX IF NOT EXISTS "trade_exceptions_status_idx" ON "trade_exceptions"("status");
CREATE INDEX IF NOT EXISTS "trade_exceptions_severity_idx" ON "trade_exceptions"("severity");
CREATE INDEX IF NOT EXISTS "trade_exceptions_owner_id_idx" ON "trade_exceptions"("owner_id");

DO $$ BEGIN
  ALTER TABLE "trade_exceptions" ADD CONSTRAINT "trade_exceptions_alert_id_fkey"
    FOREIGN KEY ("alert_id") REFERENCES "control_tower_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
