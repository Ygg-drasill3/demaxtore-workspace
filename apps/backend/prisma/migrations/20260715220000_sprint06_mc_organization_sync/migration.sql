-- Sprint 06 — Organization module binding & event synchronization

ALTER TABLE "purchase_orders"
  ADD COLUMN "organization_workspace_id" UUID;

ALTER TABLE "freight_requests"
  ADD COLUMN "organization_workspace_id" UUID;

CREATE INDEX "purchase_orders_organization_workspace_id_idx"
  ON "purchase_orders"("organization_workspace_id");

CREATE INDEX "freight_requests_organization_workspace_id_idx"
  ON "freight_requests"("organization_workspace_id");

CREATE TABLE "mc_organization_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "source_module" TEXT NOT NULL,
  "source_event_type" TEXT NOT NULL,
  "canonical_event_type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "actor_user_id" UUID,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mc_organization_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mc_organization_events_workspace_dedupe_key"
  ON "mc_organization_events"("workspace_id", "dedupe_key");

CREATE INDEX "mc_organization_events_workspace_created_idx"
  ON "mc_organization_events"("workspace_id", "created_at");

ALTER TABLE "mc_organization_events"
  ADD CONSTRAINT "mc_organization_events_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
