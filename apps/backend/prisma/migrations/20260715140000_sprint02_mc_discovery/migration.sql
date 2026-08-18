-- Sprint 02 — SmartContainer Product Discovery Experience

ALTER TABLE "catalog_categories" ADD COLUMN "description" TEXT;
ALTER TABLE "catalog_categories" ADD COLUMN "image_storage_key" TEXT;
ALTER TABLE "catalog_categories" ADD COLUMN "image_mime_type" TEXT;

ALTER TABLE "catalog_products" ADD COLUMN "short_description" TEXT;
