-- Sprint 05 — SmartContainer Organization Workspace

ALTER TABLE "mixed_container_details"
  ADD COLUMN "organization_ref" TEXT,
  ADD COLUMN "organization_status" TEXT,
  ADD COLUMN "organization_started_at" TIMESTAMP(3),
  ADD COLUMN "assigned_operations_manager_id" UUID;

CREATE UNIQUE INDEX "mixed_container_details_organization_ref_key"
  ON "mixed_container_details"("organization_ref");

CREATE TABLE "mc_organization_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "actor_user_id" UUID,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mc_organization_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mc_organization_status_history_workspace_id_created_at_idx"
  ON "mc_organization_status_history"("workspace_id", "created_at");

ALTER TABLE "mc_organization_status_history"
  ADD CONSTRAINT "mc_organization_status_history_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
