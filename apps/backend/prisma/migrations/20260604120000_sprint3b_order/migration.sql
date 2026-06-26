-- Sprint 3B — Order Workspace Runtime Foundation

CREATE TABLE "order_workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "contract_ref" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "total_value" DECIMAL(18,4) NOT NULL,
    "incoterms" TEXT NOT NULL,
    "origin_port" TEXT NOT NULL,
    "destination_port" TEXT NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "parent_workspace_id" UUID NOT NULL,
    "parent_workspace_type" TEXT NOT NULL,
    "supplier_confirmed_at" TIMESTAMP(3),
    "confirm_sla_deadline_at" TIMESTAMP(3),
    "production_started_at" TIMESTAMP(3),
    "production_completed_at" TIMESTAMP(3),
    "production_planned_at" TIMESTAMP(3),
    "inspection_requested_at" TIMESTAMP(3),
    "inspection_completed_at" TIMESTAMP(3),
    "inspection_result" TEXT,
    "inspection_report_url" TEXT,
    "inspector_name" TEXT,
    "freight_forwarder" TEXT,
    "vessel_name" TEXT,
    "bill_of_lading" TEXT,
    "expected_departure" TIMESTAMP(3),
    "departed_at" TIMESTAMP(3),
    "current_eta" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "dispute_opened_at" TIMESTAMP(3),
    "dispute_reason" TEXT,
    "dispute_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_workspaces_workspace_id_key" ON "order_workspaces"("workspace_id");
CREATE INDEX "order_workspaces_contract_ref_idx" ON "order_workspaces"("contract_ref");
CREATE INDEX "order_workspaces_parent_workspace_id_idx" ON "order_workspaces"("parent_workspace_id");

ALTER TABLE "order_workspaces" ADD CONSTRAINT "order_workspaces_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_documents" (
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

    CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_documents_workspace_id_document_type_idx" ON "order_documents"("workspace_id", "document_type");

ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_status_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "update_type" TEXT NOT NULL,
    "label" TEXT,
    "percentage" INTEGER,
    "notes" TEXT,
    "previous_eta" TIMESTAMP(3),
    "new_eta" TIMESTAMP(3),
    "delta_days" INTEGER,
    "reason" TEXT,
    "reported_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_updates_workspace_id_created_at_idx" ON "order_status_updates"("workspace_id", "created_at");

ALTER TABLE "order_status_updates" ADD CONSTRAINT "order_status_updates_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
