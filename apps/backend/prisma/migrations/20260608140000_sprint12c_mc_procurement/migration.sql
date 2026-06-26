-- Sprint 12C — Mixed Container procurement & offer workspace

ALTER TABLE "mixed_container_details"
  ADD COLUMN IF NOT EXISTS "buyer_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "assigned_manager_id" UUID,
  ADD COLUMN IF NOT EXISTS "active_offer_id" UUID,
  ADD COLUMN IF NOT EXISTS "procurement_started_at" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "mc_procurement_quotes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "container_line_id" UUID NOT NULL REFERENCES "container_lines"("id") ON DELETE CASCADE,
  "supplier_code" TEXT NOT NULL,
  "exw_price" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "price_unit" TEXT NOT NULL DEFAULT 'PALLET',
  "notes" TEXT,
  "validity_date" TIMESTAMPTZ,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_procurement_quotes_workspace_id_idx" ON "mc_procurement_quotes"("workspace_id");
CREATE INDEX IF NOT EXISTS "mc_procurement_quotes_container_line_id_idx" ON "mc_procurement_quotes"("container_line_id");

CREATE TABLE IF NOT EXISTS "mc_container_offers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "version" INT NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "export_execution_fee" DECIMAL(18,4),
  "estimated_freight" DECIMAL(18,4),
  "product_subtotal" DECIMAL(18,4),
  "offer_total" DECIMAL(18,4),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "validity_date" TIMESTAMPTZ,
  "offer_notes" TEXT,
  "sent_at" TIMESTAMPTZ,
  "viewed_at" TIMESTAMPTZ,
  "approved_at" TIMESTAMPTZ,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_container_offers_workspace_id_status_idx" ON "mc_container_offers"("workspace_id", "status");

CREATE TABLE IF NOT EXISTS "mc_offer_lines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "offer_id" UUID NOT NULL REFERENCES "mc_container_offers"("id") ON DELETE CASCADE,
  "container_line_id" UUID NOT NULL REFERENCES "container_lines"("id"),
  "product_ref" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "packaging" TEXT NOT NULL,
  "origin_country" TEXT,
  "pallet_count" INT NOT NULL,
  "unit_price" DECIMAL(18,4) NOT NULL,
  "line_total" DECIMAL(18,4) NOT NULL
);
CREATE INDEX IF NOT EXISTS "mc_offer_lines_offer_id_idx" ON "mc_offer_lines"("offer_id");

CREATE TABLE IF NOT EXISTS "mc_revision_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "offer_id" UUID NOT NULL REFERENCES "mc_container_offers"("id") ON DELETE CASCADE,
  "revision_type" TEXT NOT NULL,
  "comment" TEXT,
  "container_line_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mc_revision_requests_workspace_id_status_idx" ON "mc_revision_requests"("workspace_id", "status");

ALTER TABLE "mixed_container_details"
  ADD CONSTRAINT "mixed_container_details_active_offer_id_fkey"
  FOREIGN KEY ("active_offer_id") REFERENCES "mc_container_offers"("id") ON DELETE SET NULL;
