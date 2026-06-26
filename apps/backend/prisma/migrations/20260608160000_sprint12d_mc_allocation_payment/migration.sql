-- Sprint 12D — Mixed Container allocation, proforma & payment coordination

CREATE TABLE IF NOT EXISTS "mc_supplier_allocations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "container_request_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "container_line_id" UUID NOT NULL REFERENCES "container_lines"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "catalog_products"("id"),
  "supplier_id" UUID,
  "supplier_code" TEXT NOT NULL,
  "allocated_pallets" INT NOT NULL,
  "allocated_quantity" DECIMAL(18,4),
  "expected_exw_price" DECIMAL(18,4) NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "sort_order" INT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_supplier_allocations_container_request_id_idx" ON "mc_supplier_allocations"("container_request_id");
CREATE INDEX IF NOT EXISTS "mc_supplier_allocations_container_line_id_idx" ON "mc_supplier_allocations"("container_line_id");
CREATE INDEX IF NOT EXISTS "mc_supplier_allocations_status_idx" ON "mc_supplier_allocations"("container_request_id", "status");

CREATE TABLE IF NOT EXISTS "mc_supplier_proformas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "allocation_id" UUID NOT NULL REFERENCES "mc_supplier_allocations"("id") ON DELETE CASCADE,
  "container_request_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "proforma_number" TEXT NOT NULL,
  "supplier_reference" TEXT,
  "issue_date" TIMESTAMPTZ NOT NULL,
  "due_date" TIMESTAMPTZ NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "amount" DECIMAL(18,4) NOT NULL,
  "document_url" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_supplier_proformas_allocation_id_idx" ON "mc_supplier_proformas"("allocation_id");
CREATE INDEX IF NOT EXISTS "mc_supplier_proformas_container_request_id_idx" ON "mc_supplier_proformas"("container_request_id");

CREATE TABLE IF NOT EXISTS "mc_payment_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "allocation_id" UUID NOT NULL REFERENCES "mc_supplier_allocations"("id") ON DELETE CASCADE,
  "container_request_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "amount" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
  "payment_date" TIMESTAMPTZ,
  "buyer_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_payment_records_allocation_id_idx" ON "mc_payment_records"("allocation_id");
CREATE INDEX IF NOT EXISTS "mc_payment_records_container_request_id_idx" ON "mc_payment_records"("container_request_id");
CREATE INDEX IF NOT EXISTS "mc_payment_records_status_idx" ON "mc_payment_records"("container_request_id", "payment_status");
