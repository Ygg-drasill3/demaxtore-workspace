-- Production-ready WhatsApp conversation/message fields

ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "workspace_rfq_id" UUID;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "freightiq_rfq_id" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "whatsapp_phone" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "forwarder_phone" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

UPDATE "direct_conversations"
SET "workspace_rfq_id" = "context_workspace_id"
WHERE "context_type" = 'RFQ' AND "workspace_rfq_id" IS NULL;

UPDATE "direct_conversations"
SET "whatsapp_phone" = "peer_phone", "forwarder_phone" = NULL
WHERE "context_type" = 'RFQ' AND "peer_phone" IS NOT NULL AND "whatsapp_phone" IS NULL;

UPDATE "direct_conversations"
SET "forwarder_phone" = "peer_phone", "whatsapp_phone" = "peer_phone"
WHERE "context_type" = 'ORDER_FREIGHT' AND "peer_phone" IS NOT NULL;

UPDATE "direct_conversations" SET "status" = 'active' WHERE "status" IS NULL;

ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "sender_type" TEXT DEFAULT 'buyer';
ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "sender_phone" TEXT;
ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'platform';
ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';

UPDATE "direct_messages"
SET "source" = CASE WHEN "channel" = 'whatsapp' THEN 'whatsapp' ELSE 'platform' END
WHERE "source" IS NULL OR "source" = 'platform';

UPDATE "direct_messages"
SET "status" = COALESCE("delivery_status", 'sent')
WHERE "status" IS NULL OR "status" = 'sent';

CREATE INDEX IF NOT EXISTS "direct_conversations_workspace_rfq_id_idx"
  ON "direct_conversations"("workspace_rfq_id");

CREATE INDEX IF NOT EXISTS "direct_conversations_freightiq_rfq_id_idx"
  ON "direct_conversations"("freightiq_rfq_id");

CREATE UNIQUE INDEX IF NOT EXISTS "direct_messages_whatsapp_message_id_unique"
  ON "direct_messages"("whatsapp_message_id")
  WHERE "whatsapp_message_id" IS NOT NULL;
