-- Email Notification Bridge™ delivery tracking
CREATE TABLE "email_notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_ref" TEXT,
    "subject" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "provider_response" JSONB NOT NULL DEFAULT '{}',
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_notification_deliveries_notification_id_key" ON "email_notification_deliveries"("notification_id");
CREATE INDEX "email_notification_deliveries_status_next_retry_at_idx" ON "email_notification_deliveries"("status", "next_retry_at");
CREATE INDEX "email_notification_deliveries_user_id_queued_at_idx" ON "email_notification_deliveries"("user_id", "queued_at");
CREATE INDEX "email_notification_deliveries_provider_message_id_idx" ON "email_notification_deliveries"("provider_message_id");
