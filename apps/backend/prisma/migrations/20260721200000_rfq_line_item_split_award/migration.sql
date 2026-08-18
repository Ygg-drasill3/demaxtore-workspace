-- RFQ line-item split award foundation
ALTER TABLE "rfq_line_items" ADD COLUMN IF NOT EXISTS "award_status" TEXT NOT NULL DEFAULT 'OPEN';
CREATE INDEX IF NOT EXISTS "rfq_line_items_workspace_id_award_status_idx"
  ON "rfq_line_items"("workspace_id", "award_status");

CREATE TABLE IF NOT EXISTS "rfq_supplier_po_spawns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "supplier_user_id" UUID NOT NULL,
  "po_number" TEXT NOT NULL,
  "order_workspace_id" UUID NOT NULL,
  "issued_by_id" UUID NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mode" TEXT NOT NULL DEFAULT 'auto',
  "po_file_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rfq_supplier_po_spawns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_po_number_key"
  ON "rfq_supplier_po_spawns"("po_number");
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_order_workspace_id_key"
  ON "rfq_supplier_po_spawns"("order_workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_workspace_id_supplier_user_id_key"
  ON "rfq_supplier_po_spawns"("workspace_id", "supplier_user_id");
CREATE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_workspace_id_idx"
  ON "rfq_supplier_po_spawns"("workspace_id");

ALTER TABLE "rfq_supplier_po_spawns"
  ADD CONSTRAINT "rfq_supplier_po_spawns_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "rfq_line_awards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "rfq_line_item_id" UUID NOT NULL,
  "quotation_id" UUID NOT NULL,
  "supplier_user_id" UUID NOT NULL,
  "awarded_by_id" UUID NOT NULL,
  "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rationale" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "reverted_at" TIMESTAMP(3),
  "reverted_by_id" UUID,
  "revert_reason" TEXT,
  "supplier_po_spawn_id" UUID,
  "order_workspace_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rfq_line_awards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfq_line_awards_rfq_line_item_id_key"
  ON "rfq_line_awards"("rfq_line_item_id");
CREATE INDEX IF NOT EXISTS "rfq_line_awards_workspace_id_idx"
  ON "rfq_line_awards"("workspace_id");
CREATE INDEX IF NOT EXISTS "rfq_line_awards_workspace_id_supplier_user_id_idx"
  ON "rfq_line_awards"("workspace_id", "supplier_user_id");
CREATE INDEX IF NOT EXISTS "rfq_line_awards_supplier_po_spawn_id_idx"
  ON "rfq_line_awards"("supplier_po_spawn_id");

ALTER TABLE "rfq_line_awards"
  ADD CONSTRAINT "rfq_line_awards_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfq_line_awards"
  ADD CONSTRAINT "rfq_line_awards_rfq_line_item_id_fkey"
  FOREIGN KEY ("rfq_line_item_id") REFERENCES "rfq_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfq_line_awards"
  ADD CONSTRAINT "rfq_line_awards_quotation_id_fkey"
  FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_line_awards"
  ADD CONSTRAINT "rfq_line_awards_supplier_po_spawn_id_fkey"
  FOREIGN KEY ("supplier_po_spawn_id") REFERENCES "rfq_supplier_po_spawns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
