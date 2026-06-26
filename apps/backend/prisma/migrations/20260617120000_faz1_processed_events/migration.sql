-- Faz 1: processed_events dedup table + workspace metadata for FSM versioning
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "processed_events" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "workspace_id" UUID,
    "action" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "processed_events_source_event_id_key" ON "processed_events"("source", "event_id");
CREATE INDEX IF NOT EXISTS "processed_events_workspace_id_idx" ON "processed_events"("workspace_id");
