-- Buyer can issue PO via system-generated document or uploaded file.
-- Guard: purchase_orders is created in sprint5d_po_management (20260615); earlier
-- timestamps in CI apply this before that table exists. Skip safely if absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS document_url TEXT,
      ADD COLUMN IF NOT EXISTS document_file_name VARCHAR(500);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rfq_details') THEN
    ALTER TABLE rfq_details
      ADD COLUMN IF NOT EXISTS po_file_url TEXT;
  END IF;
END $$;
