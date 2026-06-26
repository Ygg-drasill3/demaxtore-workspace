-- Sprint 12B — Mixed Container foundation (catalog + builder MVP)

ALTER TYPE "WorkspaceType" ADD VALUE IF NOT EXISTS 'MIXED_CONTAINER';

CREATE TABLE "catalog_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");
CREATE INDEX "catalog_categories_status_sort_order_idx" ON "catalog_categories"("status", "sort_order");

CREATE TABLE "catalog_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_ref" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "packaging_description" TEXT NOT NULL,
    "units_per_pallet" INTEGER NOT NULL,
    "moq_pallets" INTEGER NOT NULL DEFAULT 1,
    "pallet_weight_kg" DECIMAL(10,2),
    "sample_available" BOOLEAN NOT NULL DEFAULT false,
    "sample_lead_days" INTEGER,
    "market_status" TEXT NOT NULL DEFAULT 'STABLE',
    "indicative_low" DECIMAL(18,4),
    "indicative_mid" DECIMAL(18,4),
    "indicative_high" DECIMAL(18,4),
    "indicative_currency" TEXT NOT NULL DEFAULT 'USD',
    "origin_country" TEXT,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "market_insight_summary" TEXT,
    "supplier_count" INTEGER NOT NULL DEFAULT 3,
    "image_storage_key" TEXT,
    "image_mime_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "catalog_products_product_ref_key" ON "catalog_products"("product_ref");
CREATE INDEX "catalog_products_category_id_status_idx" ON "catalog_products"("category_id", "status");
CREATE INDEX "catalog_products_status_idx" ON "catalog_products"("status");

CREATE TABLE "mixed_container_details" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "container_type" TEXT NOT NULL,
    "max_pallet_capacity" INTEGER NOT NULL,
    "current_pallet_count" INTEGER NOT NULL DEFAULT 0,
    "destination_market" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "est_value_min" DECIMAL(18,4),
    "est_value_max" DECIMAL(18,4),
    "pricing_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mixed_container_details_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mixed_container_details_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mixed_container_details_workspace_id_key" ON "mixed_container_details"("workspace_id");
CREATE INDEX "mixed_container_details_destination_market_idx" ON "mixed_container_details"("destination_market");

CREATE TABLE "container_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "catalog_product_id" UUID NOT NULL,
    "pallet_count" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "indicative_unit_low" DECIMAL(18,4),
    "indicative_unit_mid" DECIMAL(18,4),
    "indicative_unit_high" DECIMAL(18,4),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "container_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "container_lines_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "container_lines_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "container_lines_workspace_id_removed_at_idx" ON "container_lines"("workspace_id", "removed_at");
CREATE INDEX "container_lines_catalog_product_id_idx" ON "container_lines"("catalog_product_id");
