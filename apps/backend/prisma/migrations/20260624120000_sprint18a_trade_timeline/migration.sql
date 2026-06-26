-- Sprint 18A — Trade Timeline Engine
CREATE TABLE IF NOT EXISTS "trade_timeline_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trade_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_module" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "trade_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trade_timeline_events_trade_id_occurred_at_idx"
    ON "trade_timeline_events"("trade_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "trade_timeline_events_trade_id_event_type_idx"
    ON "trade_timeline_events"("trade_id", "event_type");

DO $$ BEGIN
    ALTER TABLE "trade_timeline_events"
        ADD CONSTRAINT "trade_timeline_events_trade_id_fkey"
        FOREIGN KEY ("trade_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
