-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SUPPLIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('RFQ', 'COMMODITYBID', 'ORDER');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'COUNTERPARTY', 'OPERATOR', 'OBSERVER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('SUBMITTED', 'REVISED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ClarificationVisibility" AS ENUM ('ALL', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "SupplierStage" AS ENUM ('INVITED', 'VIEWED', 'RETURNED', 'QUOTED', 'DECLINED');

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "location" TEXT,
    "verified_since" TIMESTAMP(3),
    "past_po_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organisation_id" UUID,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "external_ref" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "state" TEXT NOT NULL,
    "currency" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deadline_at" TIMESTAMP(3),
    "deadline_extension_count" INTEGER NOT NULL DEFAULT 0,
    "deadline_extension_total_days" INTEGER NOT NULL DEFAULT 0,
    "proforma_requested_at" TIMESTAMP(3),
    "proforma_sla_deadline_at" TIMESTAMP(3),
    "spawned_from_id" UUID,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_participants" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "participantRole" "ParticipantRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "workspace_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_details" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "product_category" TEXT NOT NULL,
    "product_description" TEXT NOT NULL,
    "target_market" TEXT NOT NULL,
    "incoterm" TEXT NOT NULL,
    "last_rejection_reason" TEXT,
    "last_rejected_at" TIMESTAMP(3),
    "selected_supplier_user_id" UUID,
    "selected_quotation_id" UUID,
    "selection_rationale" TEXT,
    "proforma_file_url" TEXT,
    "proforma_submitted_at" TIMESTAMP(3),
    "proforma_approved_at" TIMESTAMP(3),
    "po_number" TEXT,
    "po_issued_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_line_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "target_price" DECIMAL(18,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_attachments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_assignments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "removed_by_id" UUID,

    CONSTRAINT "supplier_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "unit_price_avg" DECIMAL(18,4),
    "lead_time_days" INTEGER,
    "moq" INTEGER,
    "incoterm" TEXT,
    "payment_terms" TEXT,
    "sample_avail" BOOLEAN,
    "valid_until" TIMESTAMP(3),
    "status" "QuotationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revised_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_line_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "rfq_line_item_id" UUID,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "quotation_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_threads" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_message_id" UUID,
    "body" TEXT NOT NULL,
    "visibility" "ClarificationVisibility" NOT NULL DEFAULT 'ALL',
    "mentioned_user_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_read_receipts" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "role" "Role",
    "workspace_id" UUID,
    "event_type" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_email" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_state" TEXT,
    "to_state" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_activity_log" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "stage" "SupplierStage" NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nudged_at" TIMESTAMP(3),
    "decline_reason" TEXT,

    CONSTRAINT "supplier_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "event" TEXT NOT NULL,
    "workspace_id" UUID,
    "target_id" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "client_at" TIMESTAMP(3) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "user_id" UUID,
    "route" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_external_ref_key" ON "workspaces"("external_ref");

-- CreateIndex
CREATE INDEX "workspaces_type_state_idx" ON "workspaces"("type", "state");

-- CreateIndex
CREATE INDEX "workspaces_created_by_id_idx" ON "workspaces"("created_by_id");

-- CreateIndex
CREATE INDEX "workspaces_spawned_from_id_idx" ON "workspaces"("spawned_from_id");

-- CreateIndex
CREATE INDEX "workspace_participants_workspace_id_idx" ON "workspace_participants"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_participants_user_id_idx" ON "workspace_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_participants_workspace_id_user_id_participantRole_key" ON "workspace_participants"("workspace_id", "user_id", "participantRole");

-- CreateIndex
CREATE INDEX "timeline_events_workspace_id_created_at_idx" ON "timeline_events"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_details_workspace_id_key" ON "rfq_details"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_details_po_number_key" ON "rfq_details"("po_number");

-- CreateIndex
CREATE INDEX "rfq_details_selected_supplier_user_id_idx" ON "rfq_details"("selected_supplier_user_id");

-- CreateIndex
CREATE INDEX "rfq_line_items_workspace_id_idx" ON "rfq_line_items"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_line_items_workspace_id_position_key" ON "rfq_line_items"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "rfq_attachments_workspace_id_idx" ON "rfq_attachments"("workspace_id");

-- CreateIndex
CREATE INDEX "supplier_assignments_workspace_id_idx" ON "supplier_assignments"("workspace_id");

-- CreateIndex
CREATE INDEX "supplier_assignments_supplier_user_id_idx" ON "supplier_assignments"("supplier_user_id");

-- CreateIndex
CREATE INDEX "quotations_workspace_id_idx" ON "quotations"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_workspace_id_supplier_user_id_key" ON "quotations"("workspace_id", "supplier_user_id");

-- CreateIndex
CREATE INDEX "quotation_line_items_quotation_id_idx" ON "quotation_line_items"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "clarification_threads_workspace_id_key" ON "clarification_threads"("workspace_id");

-- CreateIndex
CREATE INDEX "clarification_messages_thread_id_created_at_idx" ON "clarification_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "clarification_read_receipts_user_id_idx" ON "clarification_read_receipts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clarification_read_receipts_message_id_user_id_key" ON "clarification_read_receipts"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_workspace_id_created_at_idx" ON "notifications"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "supplier_activity_log_workspace_id_idx" ON "supplier_activity_log"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_activity_log_workspace_id_supplier_user_id_key" ON "supplier_activity_log"("workspace_id", "supplier_user_id");

-- CreateIndex
CREATE INDEX "telemetry_events_event_occurred_at_idx" ON "telemetry_events"("event", "occurred_at");

-- CreateIndex
CREATE INDEX "telemetry_events_user_id_occurred_at_idx" ON "telemetry_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_user_id_route_idx" ON "idempotency_keys"("user_id", "route");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_spawned_from_id_fkey" FOREIGN KEY ("spawned_from_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_participants" ADD CONSTRAINT "workspace_participants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_participants" ADD CONSTRAINT "workspace_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_details" ADD CONSTRAINT "rfq_details_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_items" ADD CONSTRAINT "rfq_line_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_assignments" ADD CONSTRAINT "supplier_assignments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_threads" ADD CONSTRAINT "clarification_threads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_messages" ADD CONSTRAINT "clarification_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "clarification_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_read_receipts" ADD CONSTRAINT "clarification_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "clarification_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_activity_log" ADD CONSTRAINT "supplier_activity_log_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
