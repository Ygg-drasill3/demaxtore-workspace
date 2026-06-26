-- Sprint 5E — Unified workspace communication layer

CREATE TABLE "workspace_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_conversations_workspace_type_workspace_id_key"
  ON "workspace_conversations"("workspace_type", "workspace_id");
CREATE INDEX "workspace_conversations_workspace_id_idx" ON "workspace_conversations"("workspace_id");

CREATE TABLE "workspace_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "message_type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "parent_message_id" UUID,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_messages_conversation_id_created_at_idx"
  ON "workspace_messages"("conversation_id", "created_at");
CREATE INDEX "workspace_messages_message_type_created_at_idx"
  ON "workspace_messages"("message_type", "created_at");

ALTER TABLE "workspace_messages"
  ADD CONSTRAINT "workspace_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workspace_mentions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "mentioned_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_mentions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_mentions_message_id_mentioned_user_id_key"
  ON "workspace_mentions"("message_id", "mentioned_user_id");
CREATE INDEX "workspace_mentions_mentioned_user_id_idx" ON "workspace_mentions"("mentioned_user_id");

ALTER TABLE "workspace_mentions"
  ADD CONSTRAINT "workspace_mentions_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workspace_read_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_read_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_read_receipts_message_id_user_id_key"
  ON "workspace_read_receipts"("message_id", "user_id");
CREATE INDEX "workspace_read_receipts_user_id_idx" ON "workspace_read_receipts"("user_id");

ALTER TABLE "workspace_read_receipts"
  ADD CONSTRAINT "workspace_read_receipts_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workspace_message_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID,
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_message_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_message_attachments_workspace_type_workspace_id_idx"
  ON "workspace_message_attachments"("workspace_type", "workspace_id");
CREATE INDEX "workspace_message_attachments_message_id_idx" ON "workspace_message_attachments"("message_id");

ALTER TABLE "workspace_message_attachments"
  ADD CONSTRAINT "workspace_message_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "workspace_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
