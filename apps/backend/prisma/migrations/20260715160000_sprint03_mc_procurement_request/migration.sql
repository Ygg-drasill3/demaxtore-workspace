-- Sprint 03 — SmartContainer Procurement Request Management

ALTER TABLE "mixed_container_details" ADD COLUMN "procurement_request_ref" TEXT;
CREATE UNIQUE INDEX "mixed_container_details_procurement_request_ref_key" ON "mixed_container_details"("procurement_request_ref");

CREATE TABLE "mc_procurement_status_history" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "workspace_state" TEXT NOT NULL,
    "actor_user_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_procurement_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mc_procurement_status_history_workspace_id_created_at_idx"
    ON "mc_procurement_status_history"("workspace_id", "created_at");

ALTER TABLE "mc_procurement_status_history" ADD CONSTRAINT "mc_procurement_status_history_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mc_internal_notes" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mc_internal_notes_workspace_id_created_at_idx"
    ON "mc_internal_notes"("workspace_id", "created_at");

ALTER TABLE "mc_internal_notes" ADD CONSTRAINT "mc_internal_notes_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
