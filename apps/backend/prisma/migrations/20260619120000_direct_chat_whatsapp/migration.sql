-- General direct chat + WhatsApp bridge (Workspace-native, not FreightIQ)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_phone" TEXT;

CREATE TABLE IF NOT EXISTS "direct_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "participant_low" UUID NOT NULL,
    "participant_high" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "direct_conversations_participant_low_participant_high_key"
  ON "direct_conversations"("participant_low", "participant_high");
CREATE INDEX IF NOT EXISTS "direct_conversations_updated_at_idx" ON "direct_conversations"("updated_at");

CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "author_user_id" UUID,
    "channel" TEXT NOT NULL DEFAULT 'panel',
    "body" TEXT NOT NULL,
    "whatsapp_message_id" TEXT,
    "delivery_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "direct_messages_conversation_id_created_at_idx"
  ON "direct_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "direct_messages_whatsapp_message_id_idx"
  ON "direct_messages"("whatsapp_message_id");

ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
