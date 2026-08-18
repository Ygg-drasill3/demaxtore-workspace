-- AlterEnum
ALTER TYPE "WhatsAppBusinessConnectionStatus" ADD VALUE 'ERROR';

-- AlterTable
ALTER TABLE "whatsapp_business_connections"
  ALTER COLUMN "meta_business_id" DROP NOT NULL,
  ALTER COLUMN "display_phone_number" DROP NOT NULL,
  ADD COLUMN "connected_at" TIMESTAMP(3),
  ADD COLUMN "disconnected_at" TIMESTAMP(3),
  ADD COLUMN "last_health_check_at" TIMESTAMP(3),
  ADD COLUMN "last_error_code" TEXT,
  ADD COLUMN "last_error_message" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_connection_templates" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_language" TEXT NOT NULL DEFAULT 'en',
    "purpose" TEXT NOT NULL DEFAULT 'RFQ_COLD_OUTREACH',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_unresolved_webhook_events" (
    "id" UUID NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "buyer_id" UUID,
    "supplier_wa_id" TEXT,
    "meta_message_id" TEXT,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_unresolved_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connection_audit_logs" (
    "id" UUID NOT NULL,
    "connection_id" UUID,
    "buyer_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_connection_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_templates_connection_id_template_name_templ_key" ON "whatsapp_connection_templates"("connection_id", "template_name", "template_language");

-- CreateIndex
CREATE INDEX "whatsapp_connection_templates_connection_id_purpose_is_default_idx" ON "whatsapp_connection_templates"("connection_id", "purpose", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_unresolved_webhook_events_meta_message_id_key" ON "whatsapp_unresolved_webhook_events"("meta_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_unresolved_webhook_events_phone_number_id_created_at_idx" ON "whatsapp_unresolved_webhook_events"("phone_number_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_unresolved_webhook_events_buyer_id_created_at_idx" ON "whatsapp_unresolved_webhook_events"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_unresolved_webhook_events_resolved_at_idx" ON "whatsapp_unresolved_webhook_events"("resolved_at");

-- CreateIndex
CREATE INDEX "whatsapp_connection_audit_logs_buyer_id_created_at_idx" ON "whatsapp_connection_audit_logs"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_connection_audit_logs_action_created_at_idx" ON "whatsapp_connection_audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "whatsapp_connection_templates" ADD CONSTRAINT "whatsapp_connection_templates_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_business_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connection_audit_logs" ADD CONSTRAINT "whatsapp_connection_audit_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_business_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
