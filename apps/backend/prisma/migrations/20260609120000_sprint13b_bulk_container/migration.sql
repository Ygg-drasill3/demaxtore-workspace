-- Sprint 13B — BulkContainer catalog + builder MVP

ALTER TYPE "WorkspaceType" ADD VALUE IF NOT EXISTS 'BULK_CONTAINER';

CREATE TABLE "bulk_spec_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_spec_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bulk_spec_templates_product_type_is_active_idx" ON "bulk_spec_templates"("product_type", "is_active");

CREATE TABLE "bulk_catalog_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bulk_catalog_categories_slug_key" ON "bulk_catalog_categories"("slug");
CREATE INDEX "bulk_catalog_categories_status_sort_order_idx" ON "bulk_catalog_categories"("status", "sort_order");

CREATE TABLE "bulk_catalog_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_ref" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "standard_packing" TEXT NOT NULL,
    "spec_template_id" UUID NOT NULL,
    "market_status" TEXT NOT NULL DEFAULT 'STABLE',
    "indicative_low" DECIMAL(18,4),
    "indicative_high" DECIMAL(18,4),
    "indicative_currency" TEXT NOT NULL DEFAULT 'USD',
    "min_order_mt" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_catalog_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bulk_catalog_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "bulk_catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bulk_catalog_products_spec_template_id_fkey" FOREIGN KEY ("spec_template_id") REFERENCES "bulk_spec_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "bulk_catalog_products_product_ref_key" ON "bulk_catalog_products"("product_ref");
CREATE INDEX "bulk_catalog_products_category_id_status_idx" ON "bulk_catalog_products"("category_id", "status");

CREATE TABLE "bulk_container_details" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "max_capacity_mt" DECIMAL(10,3) NOT NULL DEFAULT 25,
    "current_weight_mt" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "destination_market" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "est_value_min" DECIMAL(18,4),
    "est_value_max" DECIMAL(18,4),
    "submitted_at" TIMESTAMP(3),
    "capacity_warnings" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_container_details_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bulk_container_details_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "bulk_container_details_workspace_id_key" ON "bulk_container_details"("workspace_id");

CREATE TABLE "bulk_container_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "catalog_product_id" UUID NOT NULL,
    "spec_values" JSONB NOT NULL DEFAULT '{}',
    "quantity_mt" DECIMAL(10,3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "indicative_unit_low" DECIMAL(18,4),
    "indicative_unit_high" DECIMAL(18,4),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_container_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bulk_container_lines_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bulk_container_lines_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "bulk_catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "bulk_container_lines_workspace_id_removed_at_idx" ON "bulk_container_lines"("workspace_id", "removed_at");
