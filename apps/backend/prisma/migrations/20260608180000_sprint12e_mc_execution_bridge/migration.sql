-- Sprint 12E — SmartContainer execution bridge (master order + supplier order links)

CREATE TABLE IF NOT EXISTS "mc_master_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "smart_container_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "external_ref" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_master_orders_smart_container_id_idx" ON "mc_master_orders"("smart_container_id");

CREATE TABLE IF NOT EXISTS "mc_order_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "smart_container_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "master_order_id" UUID NOT NULL REFERENCES "mc_master_orders"("id") ON DELETE CASCADE,
  "supplier_order_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "allocation_id" UUID NOT NULL REFERENCES "mc_supplier_allocations"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "mc_order_links_allocation_id_key" ON "mc_order_links"("allocation_id");
CREATE INDEX IF NOT EXISTS "mc_order_links_smart_container_id_idx" ON "mc_order_links"("smart_container_id");
CREATE INDEX IF NOT EXISTS "mc_order_links_master_order_id_idx" ON "mc_order_links"("master_order_id");
CREATE INDEX IF NOT EXISTS "mc_order_links_supplier_order_id_idx" ON "mc_order_links"("supplier_order_id");
