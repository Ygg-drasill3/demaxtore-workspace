-- Buyer can issue PO via system-generated document or uploaded file.
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_file_name VARCHAR(500);

ALTER TABLE rfq_details
  ADD COLUMN IF NOT EXISTS po_file_url TEXT;
