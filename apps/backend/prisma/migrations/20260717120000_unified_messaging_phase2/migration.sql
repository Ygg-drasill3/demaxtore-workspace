-- Phase 2: Unified Messaging — additive only (no drops, no data deletion)

-- WorkspaceConversation extensions
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "primary_channel" TEXT NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "assigned_user_id" UUID;
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "assigned_team_id" UUID;
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP(3);
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "last_external_message_at" TIMESTAMP(3);
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "last_inbound_message_at" TIMESTAMP(3);
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "workspace_conversations_last_message_at_idx" ON "workspace_conversations"("last_message_at");
CREATE INDEX IF NOT EXISTS "workspace_conversations_assigned_user_id_idx" ON "workspace_conversations"("assigned_user_id");
CREATE INDEX IF NOT EXISTS "workspace_conversations_status_is_archived_idx" ON "workspace_conversations"("status", "is_archived");

-- WorkspaceMessage extensions
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "audience_scope" TEXT NOT NULL DEFAULT 'EXTERNAL';
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'OUTBOUND';
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "external_message_id" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "whatsapp_message_id" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3);
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3);
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "failed_at" TIMESTAMP(3);
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "failure_code" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "legacy_source" TEXT;
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "legacy_id" TEXT;

CREATE INDEX IF NOT EXISTS "workspace_messages_channel_source_created_at_idx" ON "workspace_messages"("channel_source", "created_at");
CREATE INDEX IF NOT EXISTS "workspace_messages_audience_scope_idx" ON "workspace_messages"("audience_scope");
CREATE INDEX IF NOT EXISTS "workspace_messages_external_message_id_idx" ON "workspace_messages"("external_message_id");
CREATE INDEX IF NOT EXISTS "workspace_messages_whatsapp_message_id_idx" ON "workspace_messages"("whatsapp_message_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_legacy_source_legacy_id_key"
  ON "workspace_messages"("legacy_source", "legacy_id")
  WHERE "legacy_source" IS NOT NULL AND "legacy_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_external_message_id_key"
  ON "workspace_messages"("external_message_id")
  WHERE "external_message_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_whatsapp_message_id_key"
  ON "workspace_messages"("whatsapp_message_id")
  WHERE "whatsapp_message_id" IS NOT NULL;

-- Participants
CREATE TABLE IF NOT EXISTS "workspace_conversation_participants" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "participant_key" TEXT NOT NULL,
    "user_id" UUID,
    "whatsapp_contact_id" UUID,
    "participant_type" TEXT NOT NULL,
    "participant_role" TEXT NOT NULL DEFAULT 'MEMBER',
    "company_id" UUID,
    "display_name" TEXT,
    "phone_e164" TEXT,
    "email" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "muted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_conversation_participants_conversation_id_participant_key_key"
  ON "workspace_conversation_participants"("conversation_id", "participant_key");
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_user_id_idx" ON "workspace_conversation_participants"("user_id");
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_whatsapp_contact_id_idx" ON "workspace_conversation_participants"("whatsapp_contact_id");
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_company_id_idx" ON "workspace_conversation_participants"("company_id");

ALTER TABLE "workspace_conversation_participants" DROP CONSTRAINT IF EXISTS "workspace_conversation_participants_conversation_id_fkey";
ALTER TABLE "workspace_conversation_participants" ADD CONSTRAINT "workspace_conversation_participants_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_conversation_participants" DROP CONSTRAINT IF EXISTS "workspace_conversation_participants_whatsapp_contact_id_fkey";
ALTER TABLE "workspace_conversation_participants" ADD CONSTRAINT "workspace_conversation_participants_whatsapp_contact_id_fkey"
  FOREIGN KEY ("whatsapp_contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conversation contexts
CREATE TABLE IF NOT EXISTS "conversation_contexts" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "context_type" TEXT NOT NULL,
    "context_id" UUID NOT NULL,
    "context_reference" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,

    CONSTRAINT "conversation_contexts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_contexts_conversation_id_context_type_context_id_key"
  ON "conversation_contexts"("conversation_id", "context_type", "context_id");
CREATE INDEX IF NOT EXISTS "conversation_contexts_context_type_context_id_idx"
  ON "conversation_contexts"("context_type", "context_id");

ALTER TABLE "conversation_contexts" DROP CONSTRAINT IF EXISTS "conversation_contexts_conversation_id_fkey";
ALTER TABLE "conversation_contexts" ADD CONSTRAINT "conversation_contexts_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
