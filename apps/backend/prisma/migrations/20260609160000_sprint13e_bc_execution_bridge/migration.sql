-- Sprint 13E — BulkContainer execution bridge

CREATE TABLE "bc_master_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bulk_container_id" UUID NOT NULL,
    "external_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bc_master_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bc_order_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "master_order_id" UUID NOT NULL,
    "supplier_order_id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bc_order_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bc_master_orders_external_ref_key" ON "bc_master_orders"("external_ref");
CREATE INDEX "bc_master_orders_bulk_container_id_idx" ON "bc_master_orders"("bulk_container_id");

CREATE UNIQUE INDEX "bc_order_links_allocation_id_key" ON "bc_order_links"("allocation_id");
CREATE INDEX "bc_order_links_workspace_id_idx" ON "bc_order_links"("workspace_id");
CREATE INDEX "bc_order_links_master_order_id_idx" ON "bc_order_links"("master_order_id");
CREATE INDEX "bc_order_links_supplier_order_id_idx" ON "bc_order_links"("supplier_order_id");

ALTER TABLE "bc_master_orders" ADD CONSTRAINT "bc_master_orders_bulk_container_id_fkey" FOREIGN KEY ("bulk_container_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bc_order_links" ADD CONSTRAINT "bc_order_links_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_order_links" ADD CONSTRAINT "bc_order_links_master_order_id_fkey" FOREIGN KEY ("master_order_id") REFERENCES "bc_master_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_order_links" ADD CONSTRAINT "bc_order_links_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_order_links" ADD CONSTRAINT "bc_order_links_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "bc_supplier_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
