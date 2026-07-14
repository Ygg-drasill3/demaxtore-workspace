-- Sprint 19 — Conversation Hub Foundation

ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "workspace_messages" ALTER COLUMN "author_user_id" DROP NOT NULL;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "channel_source" TEXT NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "system_event_key" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_conversation_id_system_event_key_key"
  ON "workspace_messages"("conversation_id", "system_event_key");

CREATE TABLE IF NOT EXISTS "workspace_message_deliveries" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    CONSTRAINT "workspace_message_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_message_deliveries_message_id_user_id_key"
  ON "workspace_message_deliveries"("message_id", "user_id");
CREATE INDEX IF NOT EXISTS "workspace_message_deliveries_user_id_idx"
  ON "workspace_message_deliveries"("user_id");

ALTER TABLE "workspace_message_deliveries"
  ADD CONSTRAINT "workspace_message_deliveries_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
