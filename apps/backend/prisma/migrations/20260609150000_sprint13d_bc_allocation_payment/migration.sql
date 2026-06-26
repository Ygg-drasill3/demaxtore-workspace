-- Sprint 13D — BulkContainer allocation, proforma & payment coordination

CREATE TABLE "bc_supplier_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "allocated_quantity_mt" DECIMAL(10,3) NOT NULL,
    "allocation_status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bc_supplier_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bc_supplier_proformas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allocation_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "proforma_number" TEXT NOT NULL,
    "proforma_file_url" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bc_supplier_proformas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bc_payment_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allocation_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
    "payment_reference" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bc_payment_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bc_supplier_allocations_workspace_id_idx" ON "bc_supplier_allocations"("workspace_id");
CREATE INDEX "bc_supplier_allocations_line_id_idx" ON "bc_supplier_allocations"("line_id");
CREATE INDEX "bc_supplier_allocations_workspace_id_allocation_status_idx" ON "bc_supplier_allocations"("workspace_id", "allocation_status");

CREATE INDEX "bc_supplier_proformas_allocation_id_idx" ON "bc_supplier_proformas"("allocation_id");
CREATE INDEX "bc_supplier_proformas_workspace_id_idx" ON "bc_supplier_proformas"("workspace_id");

CREATE INDEX "bc_payment_records_allocation_id_idx" ON "bc_payment_records"("allocation_id");
CREATE INDEX "bc_payment_records_workspace_id_idx" ON "bc_payment_records"("workspace_id");

ALTER TABLE "bc_supplier_allocations" ADD CONSTRAINT "bc_supplier_allocations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_supplier_allocations" ADD CONSTRAINT "bc_supplier_allocations_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "bulk_container_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bc_supplier_proformas" ADD CONSTRAINT "bc_supplier_proformas_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "bc_supplier_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_supplier_proformas" ADD CONSTRAINT "bc_supplier_proformas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bc_payment_records" ADD CONSTRAINT "bc_payment_records_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "bc_supplier_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bc_payment_records" ADD CONSTRAINT "bc_payment_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
