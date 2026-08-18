-- Per-variation metadata on quotation line items (packing, price unit, MOQ).
ALTER TABLE "quotation_line_items"
  ADD COLUMN IF NOT EXISTS "packing" TEXT,
  ADD COLUMN IF NOT EXISTS "price_unit" TEXT,
  ADD COLUMN IF NOT EXISTS "moq" INTEGER;
