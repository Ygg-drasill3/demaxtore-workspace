-- WhatsApp Cloud API Inbox — customer service conversations

CREATE TABLE "whatsapp_contacts" (
    "id" UUID NOT NULL,
    "wa_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "profile_name" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_conversations" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "phone_number_id" TEXT,
    "last_inbound_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignee_user_id" UUID,
    "user_id" UUID,
    "workspace_rfq_id" UUID,
    "order_workspace_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "meta_message_id" TEXT,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "media_id" TEXT,
    "media_storage_key" TEXT,
    "mime_type" TEXT,
    "filename" TEXT,
    "caption" TEXT,
    "reply_to_message_id" UUID,
    "reply_to_meta_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error_code" TEXT,
    "error_message" TEXT,
    "author_user_id" UUID,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "meta_timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_message_statuses" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_title" TEXT,
    "error_message" TEXT,
    "raw" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_statuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_contacts_wa_id_key" ON "whatsapp_contacts"("wa_id");
CREATE INDEX "whatsapp_contacts_phone_number_idx" ON "whatsapp_contacts"("phone_number");
CREATE INDEX "whatsapp_contacts_user_id_idx" ON "whatsapp_contacts"("user_id");

CREATE UNIQUE INDEX "whatsapp_conversations_contact_id_phone_number_id_key" ON "whatsapp_conversations"("contact_id", "phone_number_id");
CREATE INDEX "whatsapp_conversations_last_message_at_idx" ON "whatsapp_conversations"("last_message_at");
CREATE INDEX "whatsapp_conversations_assignee_user_id_idx" ON "whatsapp_conversations"("assignee_user_id");
CREATE INDEX "whatsapp_conversations_status_idx" ON "whatsapp_conversations"("status");

CREATE UNIQUE INDEX "whatsapp_messages_meta_message_id_key" ON "whatsapp_messages"("meta_message_id");
CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at");
CREATE INDEX "whatsapp_messages_meta_message_id_idx" ON "whatsapp_messages"("meta_message_id");
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

CREATE INDEX "whatsapp_message_statuses_message_id_occurred_at_idx" ON "whatsapp_message_statuses"("message_id", "occurred_at");

ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_statuses" ADD CONSTRAINT "whatsapp_message_statuses_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
