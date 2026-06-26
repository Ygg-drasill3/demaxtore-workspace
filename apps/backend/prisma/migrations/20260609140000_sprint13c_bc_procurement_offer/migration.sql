-- Sprint 13C — BulkContainer procurement & offer workflow

ALTER TABLE "bulk_container_details"
  ADD COLUMN "active_offer_id" UUID,
  ADD COLUMN "procurement_started_at" TIMESTAMP(3);

CREATE TABLE "bc_procurement_quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "packing_type_id" UUID NOT NULL,
    "specification_snapshot" JSONB NOT NULL DEFAULT '{}',
    "quantity_mt" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bc_procurement_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bc_procurement_quotes_workspace_id_line_id_key"
    ON "bc_procurement_quotes"("workspace_id", "line_id");
CREATE INDEX "bc_procurement_quotes_workspace_id_idx" ON "bc_procurement_quotes"("workspace_id");

ALTER TABLE "bc_procurement_quotes"
    ADD CONSTRAINT "bc_procurement_quotes_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_procurement_quotes"
    ADD CONSTRAINT "bc_procurement_quotes_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "bulk_container_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_procurement_quotes"
    ADD CONSTRAINT "bc_procurement_quotes_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "bulk_catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bc_procurement_quotes"
    ADD CONSTRAINT "bc_procurement_quotes_packing_type_id_fkey"
    FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bc_procurement_quotes"
    ADD CONSTRAINT "bc_procurement_quotes_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "bc_container_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "offer_reference" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "offer_total" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "offer_notes" TEXT,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bc_container_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bc_container_offers_offer_reference_key" ON "bc_container_offers"("offer_reference");
CREATE INDEX "bc_container_offers_workspace_id_status_idx" ON "bc_container_offers"("workspace_id", "status");

ALTER TABLE "bc_container_offers"
    ADD CONSTRAINT "bc_container_offers_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_container_offers"
    ADD CONSTRAINT "bc_container_offers_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bulk_container_details"
    ADD CONSTRAINT "bulk_container_details_active_offer_id_fkey"
    FOREIGN KEY ("active_offer_id") REFERENCES "bc_container_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "bc_offer_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "packing_type" TEXT NOT NULL,
    "specification_summary" TEXT NOT NULL,
    "quantity_mt" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "line_total" DECIMAL(18,4) NOT NULL,
    CONSTRAINT "bc_offer_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bc_offer_lines_offer_id_idx" ON "bc_offer_lines"("offer_id");

ALTER TABLE "bc_offer_lines"
    ADD CONSTRAINT "bc_offer_lines_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "bc_container_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_offer_lines"
    ADD CONSTRAINT "bc_offer_lines_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "bulk_container_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "bc_revision_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bc_revision_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bc_revision_requests_workspace_id_status_idx" ON "bc_revision_requests"("workspace_id", "status");

ALTER TABLE "bc_revision_requests"
    ADD CONSTRAINT "bc_revision_requests_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_revision_requests"
    ADD CONSTRAINT "bc_revision_requests_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "bc_container_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_revision_requests"
    ADD CONSTRAINT "bc_revision_requests_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
