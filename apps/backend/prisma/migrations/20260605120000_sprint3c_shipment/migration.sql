-- Sprint 3C — Shipment Workspace Runtime Foundation

ALTER TYPE "WorkspaceType" ADD VALUE 'SHIPMENT';

CREATE TABLE "shipment_workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "order_ref" TEXT NOT NULL,
    "po_ref" TEXT,
    "contract_ref" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "origin_port" TEXT NOT NULL,
    "destination_port" TEXT NOT NULL,
    "container_number" TEXT,
    "vessel_name" TEXT,
    "voyage_number" TEXT,
    "booking_ref" TEXT,
    "carrier_name" TEXT,
    "booking_confirmed_at" TIMESTAMP(3),
    "container_assigned_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "loaded_at" TIMESTAMP(3),
    "departed_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "customs_started_at" TIMESTAMP(3),
    "customs_completed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipment_workspaces_workspace_id_key" ON "shipment_workspaces"("workspace_id");
CREATE INDEX "shipment_workspaces_order_workspace_id_idx" ON "shipment_workspaces"("order_workspace_id");
CREATE INDEX "shipment_workspaces_order_ref_idx" ON "shipment_workspaces"("order_ref");

ALTER TABLE "shipment_workspaces" ADD CONSTRAINT "shipment_workspaces_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shipment_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_by_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipment_documents_workspace_id_document_type_idx" ON "shipment_documents"("workspace_id", "document_type");

ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shipment_status_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "update_type" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "reported_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_status_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipment_status_updates_workspace_id_created_at_idx" ON "shipment_status_updates"("workspace_id", "created_at");

ALTER TABLE "shipment_status_updates" ADD CONSTRAINT "shipment_status_updates_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shipment_exceptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "state_before" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reported_by_id" UUID NOT NULL,
    "resolved_by_id" UUID,
    "resolution" TEXT,
    "resume_state" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "shipment_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipment_exceptions_workspace_id_status_idx" ON "shipment_exceptions"("workspace_id", "status");

ALTER TABLE "shipment_exceptions" ADD CONSTRAINT "shipment_exceptions_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
