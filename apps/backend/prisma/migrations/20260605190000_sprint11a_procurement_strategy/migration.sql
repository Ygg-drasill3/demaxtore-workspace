-- Sprint 11A — Procurement strategy on RFQ
ALTER TABLE rfq_details
  ADD COLUMN IF NOT EXISTS procurement_method TEXT,
  ADD COLUMN IF NOT EXISTS linked_commoditybid_id UUID;

CREATE INDEX IF NOT EXISTS rfq_details_procurement_method_idx ON rfq_details (procurement_method);

-- Existing RFQs predate strategy selection — treat as Direct RFQ
UPDATE rfq_details SET procurement_method = 'DIRECT_RFQ' WHERE procurement_method IS NULL;
