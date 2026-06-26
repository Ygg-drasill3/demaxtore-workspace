-- Link RFQ attachments to clarification messages
ALTER TABLE "rfq_attachments" ADD COLUMN "clarification_message_id" UUID;

CREATE INDEX "rfq_attachments_clarification_message_id_idx" ON "rfq_attachments"("clarification_message_id");

ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_clarification_message_id_fkey"
  FOREIGN KEY ("clarification_message_id") REFERENCES "clarification_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
