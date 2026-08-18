-- Sprint 01 — SmartContainer Product Taxonomy & Catalog Foundation

CREATE TABLE "catalog_industries" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_industries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_industries_slug_key" ON "catalog_industries"("slug");
CREATE INDEX "catalog_industries_status_sort_order_idx" ON "catalog_industries"("status", "sort_order");

-- Default industry for existing categories
INSERT INTO "catalog_industries" ("id", "slug", "name", "sort_order", "status", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000101', 'food-beverages', 'Food & Beverages', 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "catalog_categories" ADD COLUMN "industry_id" UUID;

UPDATE "catalog_categories" SET "industry_id" = '00000000-0000-0000-0000-000000000101';

ALTER TABLE "catalog_categories" ALTER COLUMN "industry_id" SET NOT NULL;

ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_industry_id_fkey"
    FOREIGN KEY ("industry_id") REFERENCES "catalog_industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "catalog_categories_industry_id_status_sort_order_idx" ON "catalog_categories"("industry_id", "status", "sort_order");

CREATE TABLE "catalog_packaging" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "units_per_pallet" INTEGER NOT NULL,
    "moq_pallets" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "packing_type_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_packaging_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_packaging_product_id_slug_key" ON "catalog_packaging"("product_id", "slug");
CREATE INDEX "catalog_packaging_product_id_status_sort_order_idx" ON "catalog_packaging"("product_id", "status", "sort_order");

ALTER TABLE "catalog_packaging" ADD CONSTRAINT "catalog_packaging_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catalog_packaging" ADD CONSTRAINT "catalog_packaging_packing_type_id_fkey"
    FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "container_lines" ADD COLUMN "catalog_packaging_id" UUID;

ALTER TABLE "container_lines" ADD CONSTRAINT "container_lines_catalog_packaging_id_fkey"
    FOREIGN KEY ("catalog_packaging_id") REFERENCES "catalog_packaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;
