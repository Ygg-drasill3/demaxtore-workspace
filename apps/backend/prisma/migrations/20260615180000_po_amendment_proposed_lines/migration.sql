ALTER TABLE "purchase_order_amendments" ADD COLUMN IF NOT EXISTS "proposed_lines" JSONB;
