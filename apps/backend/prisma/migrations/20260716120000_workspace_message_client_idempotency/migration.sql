-- MSG-001: idempotent workspace message creation per sender + conversation
ALTER TABLE "workspace_messages" ADD COLUMN "client_message_id" UUID;

CREATE UNIQUE INDEX "workspace_messages_conversation_id_author_user_id_client_message_id_key"
  ON "workspace_messages"("conversation_id", "author_user_id", "client_message_id");
