-- Multi-container orders: up to 5 containers per buyer order group
ALTER TABLE "mixed_container_details" ADD COLUMN IF NOT EXISTS "order_group_id" UUID;
ALTER TABLE "mixed_container_details" ADD COLUMN IF NOT EXISTS "container_sequence" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "mixed_container_details_order_group_id_idx"
  ON "mixed_container_details"("order_group_id");

UPDATE "mixed_container_details"
SET "order_group_id" = "workspace_id"
WHERE "order_group_id" IS NULL;
