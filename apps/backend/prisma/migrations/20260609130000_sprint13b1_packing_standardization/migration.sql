-- Sprint 13B.1 — Unified Packing Type architecture

CREATE TABLE "packing_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "unit_weight" DECIMAL(10,3),
    "unit_weight_uom" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "packing_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "packing_types_code_key" ON "packing_types"("code");
CREATE INDEX "packing_types_segment_is_active_idx" ON "packing_types"("segment", "is_active");

CREATE TABLE "product_packing_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_kind" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "packing_type_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_packing_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_packing_types_catalog_kind_product_id_packing_type_id_key"
    ON "product_packing_types"("catalog_kind", "product_id", "packing_type_id");
CREATE INDEX "product_packing_types_catalog_kind_product_id_is_active_idx"
    ON "product_packing_types"("catalog_kind", "product_id", "is_active");

ALTER TABLE "product_packing_types"
    ADD CONSTRAINT "product_packing_types_packing_type_id_fkey"
    FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "container_lines" ADD COLUMN "packing_type_id" UUID;
ALTER TABLE "bulk_container_lines" ADD COLUMN "packing_type_id" UUID;

-- Migration fallback for existing lines (replaced by seed assignments)
INSERT INTO "packing_types" ("id", "code", "name", "segment", "is_active")
VALUES ('00000000-0000-0000-0000-000000000001', 'PT-MIGRATION-FALLBACK', 'Standard Pack', 'RETAIL', true)
ON CONFLICT ("code") DO NOTHING;

UPDATE "container_lines"
SET "packing_type_id" = '00000000-0000-0000-0000-000000000001'
WHERE "packing_type_id" IS NULL;

UPDATE "bulk_container_lines"
SET "packing_type_id" = '00000000-0000-0000-0000-000000000001'
WHERE "packing_type_id" IS NULL;

ALTER TABLE "container_lines" ALTER COLUMN "packing_type_id" SET NOT NULL;
ALTER TABLE "bulk_container_lines" ALTER COLUMN "packing_type_id" SET NOT NULL;

ALTER TABLE "container_lines"
    ADD CONSTRAINT "container_lines_packing_type_id_fkey"
    FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bulk_container_lines"
    ADD CONSTRAINT "bulk_container_lines_packing_type_id_fkey"
    FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "container_lines_packing_type_id_idx" ON "container_lines"("packing_type_id");
CREATE INDEX "bulk_container_lines_packing_type_id_idx" ON "bulk_container_lines"("packing_type_id");
