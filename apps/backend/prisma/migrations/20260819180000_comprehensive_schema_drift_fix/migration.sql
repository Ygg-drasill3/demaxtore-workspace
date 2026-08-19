-- Comprehensive schema drift fix: generated from prisma migrate diff.
-- All operations are guarded for idempotency.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WhatsAppBusinessConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRED', 'REVOKED', 'DISCONNECTED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchaseOrderSource" AS ENUM ('RFQ', 'DIRECT', 'REORDER', 'API', 'LEGACY', 'COMMODITY_BID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrderWorkspaceOrigin" AS ENUM ('RFQ', 'DIRECT_PO', 'REORDER', 'API', 'LEGACY', 'COMMODITY_BID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CustomsCaseStatus" AS ENUM ('DRAFT', 'PREPARING', 'READY_FOR_BROKER', 'BROKER_REVIEW', 'DECLARATION_PREPARING', 'DECLARATION_FILED', 'CUSTOMS_PROCESSING', 'CLEARANCE_PENDING', 'CLEARED', 'HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CustomsStatusSource" AS ENUM ('BUYER', 'CUSTOMS_BROKER', 'DEMAXTORE_OPERATIONS', 'SYSTEM_DERIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CustomsHoldCategory" AS ENUM ('DOCUMENT', 'CLASSIFICATION', 'BROKER_REVIEW', 'CUSTOMS_QUERY', 'PAYMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProductClassificationStatus" AS ENUM ('UNCLASSIFIED', 'CANDIDATE', 'VERIFIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProductClassificationSource" AS ENUM ('USER_ENTERED', 'SUPPLIER_PROVIDED', 'HISTORICAL_IMPORT', 'CUSTOMS_BROKER_VERIFIED', 'SYSTEM_SUGGESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'ORIGIN_AGENT' IF NOT EXISTS;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'CUSTOMS_BROKER' IF NOT EXISTS;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'TRUCKER' IF NOT EXISTS;
EXCEPTION WHEN others THEN NULL; END $$;


-- AlterTable
ALTER TABLE "catalog_categories" ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "image_mime_type" TEXT,
ADD COLUMN IF NOT EXISTS "image_storage_key" TEXT,
ADD COLUMN IF NOT EXISTS "industry_id" UUID;  -- nullable: existing rows have no industry

-- AlterTable
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "short_description" TEXT;

-- AlterTable
ALTER TABLE "container_lines" ADD COLUMN IF NOT EXISTS "catalog_packaging_id" UUID;

-- AlterTable
ALTER TABLE "freight_requests" ADD COLUMN IF NOT EXISTS "organization_workspace_id" UUID;

-- AlterTable
ALTER TABLE "mc_offer_lines" ADD COLUMN IF NOT EXISTS "brand" TEXT;

-- AlterTable
ALTER TABLE "mc_procurement_quotes" ADD COLUMN IF NOT EXISTS "brand" TEXT;

-- AlterTable
ALTER TABLE "mixed_container_details" ADD COLUMN IF NOT EXISTS "assigned_operations_manager_id" UUID,
ADD COLUMN IF NOT EXISTS "commercial_proposal_ref" TEXT,
ADD COLUMN IF NOT EXISTS "container_sequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "order_group_id" UUID,
ADD COLUMN IF NOT EXISTS "organization_ref" TEXT,
ADD COLUMN IF NOT EXISTS "organization_started_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "organization_status" TEXT,
ADD COLUMN IF NOT EXISTS "procurement_request_ref" TEXT;

-- AlterTable
ALTER TABLE "order_workspaces" ADD COLUMN IF NOT EXISTS "origin" "OrderWorkspaceOrigin" NOT NULL DEFAULT 'RFQ',
ALTER COLUMN "parent_workspace_id" DROP NOT NULL,
ALTER COLUMN "parent_workspace_type" DROP NOT NULL;

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "buyer_operating_model" TEXT NOT NULL DEFAULT 'INTERNATIONAL',
ADD COLUMN IF NOT EXISTS "catalog_external_url" TEXT,
ADD COLUMN IF NOT EXISTS "catalog_mime_type" TEXT,
ADD COLUMN IF NOT EXISTS "catalog_storage_key" TEXT,
ADD COLUMN IF NOT EXISTS "interest_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "logo_mime_type" TEXT,
ADD COLUMN IF NOT EXISTS "logo_storage_key" TEXT;

-- AlterTable
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "product_id" UUID,
ADD COLUMN IF NOT EXISTS "quotation_line_id" UUID,
ADD COLUMN IF NOT EXISTS "rfq_line_item_id" UUID;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "organization_workspace_id" UUID,
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
-- Migrate source column: drop varchar and add enum (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders'
      AND column_name = 'source' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "purchase_orders" DROP COLUMN "source";
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'source'
  ) THEN
    ALTER TABLE "purchase_orders" ADD COLUMN "source" "PurchaseOrderSource" NOT NULL DEFAULT 'RFQ';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "quotation_line_items" ADD COLUMN IF NOT EXISTS "moq" INTEGER,
ADD COLUMN IF NOT EXISTS "packing" TEXT,
ADD COLUMN IF NOT EXISTS "price_unit" TEXT;

-- AlterTable
ALTER TABLE "rfq_line_items" ADD COLUMN IF NOT EXISTS "award_status" TEXT NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "shipment_workspaces" ADD COLUMN IF NOT EXISTS "airline_name" TEXT,
ADD COLUMN IF NOT EXISTS "booking_cancel_reason" TEXT,
ADD COLUMN IF NOT EXISTS "booking_cancelled_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "booking_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "booking_requested_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "booking_source" TEXT,
ADD COLUMN IF NOT EXISTS "booking_status" TEXT,
ADD COLUMN IF NOT EXISTS "cargo_ready_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "carrier_booking_number" TEXT,
ADD COLUMN IF NOT EXISTS "cy_cutoff" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "document_cutoff" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "eta" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "etd" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "flight_number" TEXT,
ADD COLUMN IF NOT EXISTS "forwarder_name" TEXT,
ADD COLUMN IF NOT EXISTS "freight_offer_id" UUID,
ADD COLUMN IF NOT EXISTS "freight_request_id" UUID,
ADD COLUMN IF NOT EXISTS "incoterm" TEXT,
ADD COLUMN IF NOT EXISTS "si_cutoff" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "total_gross_weight_kg" DECIMAL(14,3),
ADD COLUMN IF NOT EXISTS "total_volume_cbm" DECIMAL(14,3),
ADD COLUMN IF NOT EXISTS "train_reference" TEXT,
ADD COLUMN IF NOT EXISTS "transport_mode" TEXT NOT NULL DEFAULT 'SEA',
ADD COLUMN IF NOT EXISTS "truck_reference" TEXT,
ADD COLUMN IF NOT EXISTS "vgm_cutoff" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" TEXT,
ADD COLUMN IF NOT EXISTS "phone_verification_status" TEXT,
ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "phone_verified_by" UUID;

-- AlterTable
ALTER TABLE "workspace_conversations" ADD COLUMN IF NOT EXISTS "assigned_team_id" UUID,
ADD COLUMN IF NOT EXISTS "assigned_user_id" UUID,
ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "last_external_message_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_inbound_message_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "primary_channel" TEXT NOT NULL DEFAULT 'WORKSPACE',
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS "subject" TEXT;

-- AlterTable
ALTER TABLE "workspace_messages" ADD COLUMN IF NOT EXISTS "audience_scope" TEXT NOT NULL DEFAULT 'EXTERNAL',
ADD COLUMN IF NOT EXISTS "client_message_id" UUID,
ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN IF NOT EXISTS "external_message_id" TEXT,
ADD COLUMN IF NOT EXISTS "failed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "failure_code" TEXT,
ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
ADD COLUMN IF NOT EXISTS "legacy_id" TEXT,
ADD COLUMN IF NOT EXISTS "legacy_source" TEXT,
ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "whatsapp_message_id" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "phone_verification_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" UUID,

    CONSTRAINT "phone_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rfq_line_awards" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "rfq_line_item_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "awarded_by_id" UUID NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reverted_at" TIMESTAMP(3),
    "reverted_by_id" UUID,
    "revert_reason" TEXT,
    "supplier_po_spawn_id" UUID,
    "order_workspace_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_line_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rfq_supplier_po_spawns" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "issued_by_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL DEFAULT 'auto',
    "po_file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_supplier_po_spawns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inspection_workspaces" (
    "id" UUID NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "inspection_number" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL DEFAULT 'FINAL_RANDOM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "factory_name" TEXT,
    "supplier_name" TEXT,
    "inspector_name" TEXT,
    "inspector_org" TEXT,
    "inspector_contact" TEXT,
    "assigned_at" TIMESTAMP(3),
    "planned_date" TIMESTAMP(3),
    "actual_start_at" TIMESTAMP(3),
    "actual_finish_at" TIMESTAMP(3),
    "decision" TEXT,
    "decision_notes" TEXT,
    "decision_at" TIMESTAMP(3),
    "decision_locked" BOOLEAN NOT NULL DEFAULT false,
    "purchase_order_id" UUID,
    "shipment_workspace_id" UUID,
    "requested_by_user_id" UUID,
    "requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inspection_findings" (
    "id" UUID NOT NULL,
    "inspection_workspace_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inspection_defects" (
    "id" UUID NOT NULL,
    "inspection_workspace_id" UUID NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inspection_ncrs" (
    "id" UUID NOT NULL,
    "inspection_workspace_id" UUID NOT NULL,
    "ncr_number" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "owner_name" TEXT,
    "due_date" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_ncrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_tasks" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "purchase_order_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "due_date" TIMESTAMP(3),
    "assigned_to_id" UUID,
    "created_by_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" UUID,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "automation_key" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_issues" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_task_id" UUID,
    "reported_by_id" UUID NOT NULL,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "closed_by_id" UUID,
    "closed_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "resolution_suggested_at" TIMESTAMP(3),
    "automation_key" TEXT,
    "impact_type" TEXT,
    "owner_role" TEXT,
    "recommended_action" TEXT,
    "source_event_type" TEXT,
    "source_rule_id" TEXT,
    "source_alert_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_assignments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "partner_role" TEXT NOT NULL,
    "organisation_id" UUID,
    "assigned_by_id" UUID,
    "notes" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inland_deliveries" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "customs_case_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "status_source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "delivery_name" TEXT,
    "delivery_address" TEXT,
    "delivery_city" TEXT,
    "delivery_postal_code" TEXT,
    "delivery_contact_name" TEXT,
    "delivery_contact_phone" TEXT,
    "pickup_location" TEXT,
    "pickup_at" TIMESTAMP(3),
    "pickup_window" TEXT,
    "appointment_ref" TEXT,
    "instructions" TEXT,
    "trucker_user_id" UUID,
    "trucker_assignment_id" UUID,
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "vehicle_plate" TEXT,
    "release_reference" TEXT,
    "picked_up_at" TIMESTAMP(3),
    "gate_out_at" TIMESTAMP(3),
    "in_transit_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "pod_status" TEXT NOT NULL DEFAULT 'PENDING',
    "pod_trade_document_id" UUID,
    "inland_cost_amount" DECIMAL(18,4),
    "inland_cost_currency" TEXT,
    "inland_cost_kind" TEXT,
    "inland_cost_source" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inland_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inland_delivery_events" (
    "id" UUID NOT NULL,
    "inland_delivery_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "source" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inland_delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction_costs" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "order_workspace_id" UUID,
    "customs_case_id" UUID,
    "inland_delivery_id" UUID,
    "component_type" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "cost_nature" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "document_id" UUID,
    "incurred_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "landed_cost_calculations" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" UUID NOT NULL,
    "shipment_workspace_id" UUID,
    "order_workspace_id" UUID,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "calculation_currency" TEXT NOT NULL,
    "exchange_rate" DECIMAL(18,8),
    "exchange_rate_source" TEXT,
    "exchange_rate_date" TIMESTAMP(3),
    "fx_snapshot" JSONB NOT NULL DEFAULT '{}',
    "goods_cost" DECIMAL(18,4),
    "freight_cost" DECIMAL(18,4),
    "insurance_cost" DECIMAL(18,4),
    "duty_tax_cost" DECIMAL(18,4),
    "customs_local_cost" DECIMAL(18,4),
    "inland_cost" DECIMAL(18,4),
    "other_cost" DECIMAL(18,4),
    "known_subtotal" DECIMAL(18,4) NOT NULL,
    "total_landed_cost" DECIMAL(18,4),
    "estimated_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "actual_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "missing_component_count" INTEGER NOT NULL DEFAULT 0,
    "completeness" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "diagnostics" JSONB NOT NULL DEFAULT '[]',
    "input_hash" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landed_cost_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "landed_cost_components" (
    "id" UUID NOT NULL,
    "calculation_id" UUID NOT NULL,
    "component_type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "amount_original" DECIMAL(18,4),
    "currency_original" TEXT,
    "fx_rate" DECIMAL(18,8),
    "amount_calculation_currency" DECIMAL(18,4),
    "cost_nature" TEXT NOT NULL,
    "inclusion" TEXT NOT NULL DEFAULT 'INCLUDED',
    "description" TEXT,
    "allocation_method" TEXT,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landed_cost_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "delivery_records" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shipment_id" UUID,
    "delivered_at" TIMESTAMP(3) NOT NULL,
    "delivered_by" TEXT,
    "received_by" TEXT,
    "proof_document_id" TEXT,
    "remarks" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_completions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "checklist_snapshot" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMP(3),
    "completed_by_id" UUID,
    "reopened_at" TIMESTAMP(3),
    "reopened_by_id" UUID,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_task_comments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customs_cases" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "status" "CustomsCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "readiness_status" TEXT NOT NULL DEFAULT 'NOT_READY',
    "destination_country_code" TEXT,
    "broker_user_id" UUID,
    "broker_assignment_id" UUID,
    "declaration_reference" TEXT,
    "declaration_date" TIMESTAMP(3),
    "customs_office" TEXT,
    "status_source" "CustomsStatusSource" NOT NULL DEFAULT 'SYSTEM_DERIVED',
    "hold_category" "CustomsHoldCategory",
    "hold_reason" TEXT,
    "hold_at" TIMESTAMP(3),
    "previous_status_before_hold" "CustomsCaseStatus",
    "cleared_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customs_case_events" (
    "id" UUID NOT NULL,
    "customs_case_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "source" "CustomsStatusSource" NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customs_case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "duty_tax_rules" (
    "id" UUID NOT NULL,
    "component_type" TEXT NOT NULL,
    "gtip_code" TEXT NOT NULL,
    "origin_country_code" TEXT,
    "rate_percent" DECIMAL(10,6) NOT NULL,
    "calculation_method" TEXT NOT NULL DEFAULT 'PERCENT_OF_BASE',
    "base_formula" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "source" TEXT NOT NULL DEFAULT 'ADMIN_CONFIGURED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "duty_tax_calculations" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "customs_case_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "calculation_date" TIMESTAMP(3) NOT NULL,
    "calculation_currency" TEXT NOT NULL,
    "source_currency" TEXT,
    "goods_value_estimate" DECIMAL(18,4),
    "freight_amount" DECIMAL(18,4),
    "insurance_amount" DECIMAL(18,4),
    "customs_value_estimate" DECIMAL(18,4),
    "exchange_rate" DECIMAL(18,8),
    "exchange_rate_source" TEXT,
    "exchange_rate_date" TIMESTAMP(3),
    "freight_allocation_method" TEXT NOT NULL DEFAULT 'VALUE',
    "total_evaluated_amount" DECIMAL(18,4),
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "completeness_label" TEXT NOT NULL DEFAULT 'LOW',
    "input_hash" TEXT NOT NULL,
    "rule_set_fingerprint" TEXT NOT NULL,
    "diagnostics" JSONB NOT NULL DEFAULT '[]',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_by_id" UUID,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "duty_tax_calculation_lines" (
    "id" UUID NOT NULL,
    "calculation_id" UUID NOT NULL,
    "purchase_order_line_id" UUID,
    "product_id" UUID,
    "sku" TEXT,
    "description" TEXT,
    "gtip_code" TEXT,
    "classification_status" TEXT,
    "classification_source" TEXT,
    "origin_country_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "uom" TEXT,
    "goods_value" DECIMAL(18,4),
    "allocated_freight" DECIMAL(18,4),
    "customs_value" DECIMAL(18,4),
    "component_type" TEXT NOT NULL,
    "component_status" TEXT NOT NULL,
    "taxable_base" DECIMAL(18,4),
    "rate_percent" DECIMAL(10,6),
    "amount" DECIMAL(18,4),
    "rule_id" UUID,
    "rule_version" INTEGER,
    "rule_source" TEXT,
    "warning" TEXT,
    "override_amount" DECIMAL(18,4),
    "override_reason" TEXT,
    "override_by_id" UUID,
    "override_at" TIMESTAMP(3),
    "input_sources" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duty_tax_calculation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shipment_milestones" (
    "id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "planned_at" TIMESTAMP(3),
    "estimated_at" TIMESTAMP(3),
    "actual_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "delay_minutes" INTEGER,
    "sequence" INTEGER NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shipment_containers" (
    "id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "container_number" TEXT NOT NULL,
    "container_type" TEXT,
    "seal_number" TEXT,
    "gross_weight_kg" DECIMAL(14,3),
    "net_weight_kg" DECIMAL(14,3),
    "volume_cbm" DECIMAL(14,3),
    "package_count" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trade_shipment_links" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "order_workspace_id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_shipment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shipment_line_allocations" (
    "id" UUID NOT NULL,
    "purchase_order_line_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "shipment_workspace_id" UUID NOT NULL,
    "shipment_container_id" UUID,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_line_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customs_description" TEXT,
    "manufacturer" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'PCS',
    "net_weight" DECIMAL(18,4),
    "gross_weight" DECIMAL(18,4),
    "weight_unit" TEXT DEFAULT 'KG',
    "length" DECIMAL(18,4),
    "width" DECIMAL(18,4),
    "height" DECIMAL(18,4),
    "dimension_unit" TEXT DEFAULT 'CM',
    "country_of_origin" TEXT,
    "gtip_code" TEXT,
    "classification_status" "ProductClassificationStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
    "classification_source" "ProductClassificationSource",
    "classification_notes" TEXT,
    "classification_updated_at" TIMESTAMP(3),
    "classification_updated_by_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_supplier_references" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "supplier_sku" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_supplier_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_change_events" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "purchase_order_commercial_documents" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "order_id" UUID,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "reference_number" TEXT,
    "document_date" DATE,
    "file_name" TEXT NOT NULL,
    "original_file_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaced_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "previous_storage_key" TEXT,

    CONSTRAINT "purchase_order_commercial_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "direct_po_document_uploads" (
    "id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_po_document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
    "id" UUID NOT NULL,
    "wa_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "profile_name" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_message_statuses" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_business_connections" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "meta_business_id" TEXT,
    "waba_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "display_phone_number" TEXT,
    "verified_name" TEXT,
    "encrypted_access_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "status" "WhatsAppBusinessConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "connected_at" TIMESTAMP(3),
    "disconnected_at" TIMESTAMP(3),
    "last_health_check_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_business_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_connection_templates" (
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
CREATE TABLE IF NOT EXISTS "whatsapp_unresolved_webhook_events" (
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
CREATE TABLE IF NOT EXISTS "whatsapp_connection_audit_logs" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_industries" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "organisation_category_interests" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "catalog_category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_category_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_packaging" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "units_per_pallet" INTEGER NOT NULL,
    "moq_pallets" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "packing_type_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_packaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mc_organization_status_history" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_user_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_organization_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mc_organization_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "source_event_type" TEXT NOT NULL,
    "canonical_event_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actor_user_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_organization_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mc_procurement_status_history" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "workspace_state" TEXT NOT NULL,
    "actor_user_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_procurement_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mc_internal_notes" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messaging_outbox_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "conversation_id" UUID,
    "message_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messaging_idempotency_keys" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "workspace_academy_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "welcome_completed_at" TIMESTAMP(3),
    "welcome_dismissed_at" TIMESTAMP(3),
    "process_overview_completed_at" TIMESTAMP(3),
    "checklist_dismissed_at" TIMESTAMP(3),
    "last_seen_academy_version" INTEGER NOT NULL DEFAULT 1,
    "last_automatic_guide_id" TEXT,
    "last_automatic_guide_at" TIMESTAMP(3),
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "workspace_academy_guide_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "guide_id" TEXT NOT NULL,
    "guide_version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "last_step_index" INTEGER NOT NULL DEFAULT 0,
    "display_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_guide_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "workspace_academy_task_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "completed_at" TIMESTAMP(3),
    "completed_by_event" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_task_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "workspace_academy_article_views" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_id" TEXT NOT NULL,
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "view_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workspace_academy_article_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_settings" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "risk_at_risk_minutes" INTEGER NOT NULL DEFAULT 1,
    "risk_delayed_minutes" INTEGER NOT NULL DEFAULT 1440,
    "default_eta_buffer_hours" INTEGER NOT NULL DEFAULT 24,
    "default_issue_severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "default_task_priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "completion_docs_required" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_automation_rules" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_task_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "default_assignee_role" TEXT,
    "due_offset_days" INTEGER NOT NULL DEFAULT 3,
    "automation_trigger" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_milestone_templates" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "default_offset_days" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "skip_by_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_milestone_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_config_audits" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" UUID,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_config_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_verification_requests_status_submitted_at_idx" ON "phone_verification_requests"("status", "submitted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_verification_requests_user_id_submitted_at_idx" ON "phone_verification_requests"("user_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_line_awards_rfq_line_item_id_key" ON "rfq_line_awards"("rfq_line_item_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfq_line_awards_workspace_id_idx" ON "rfq_line_awards"("workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfq_line_awards_workspace_id_supplier_user_id_idx" ON "rfq_line_awards"("workspace_id", "supplier_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfq_line_awards_supplier_po_spawn_id_idx" ON "rfq_line_awards"("supplier_po_spawn_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_po_number_key" ON "rfq_supplier_po_spawns"("po_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_order_workspace_id_key" ON "rfq_supplier_po_spawns"("order_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_workspace_id_idx" ON "rfq_supplier_po_spawns"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_po_spawns_workspace_id_supplier_user_id_key" ON "rfq_supplier_po_spawns"("workspace_id", "supplier_user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_workspaces_inspection_number_key" ON "inspection_workspaces"("inspection_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_workspaces_order_workspace_id_idx" ON "inspection_workspaces"("order_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_workspaces_status_idx" ON "inspection_workspaces"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_workspaces_shipment_workspace_id_idx" ON "inspection_workspaces"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_findings_inspection_workspace_id_idx" ON "inspection_findings"("inspection_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_defects_inspection_workspace_id_idx" ON "inspection_defects"("inspection_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inspection_ncrs_inspection_workspace_id_idx" ON "inspection_ncrs"("inspection_workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_ncrs_inspection_workspace_id_ncr_number_key" ON "inspection_ncrs"("inspection_workspace_id", "ncr_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_tasks_order_id_status_idx" ON "operational_tasks"("order_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_tasks_assigned_to_id_status_idx" ON "operational_tasks"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_tasks_due_date_idx" ON "operational_tasks"("due_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_tasks_purchase_order_id_idx" ON "operational_tasks"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "operational_tasks_order_id_automation_key_key" ON "operational_tasks"("order_id", "automation_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_order_id_status_idx" ON "operational_issues"("order_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_status_idx" ON "operational_issues"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_severity_idx" ON "operational_issues"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_category_idx" ON "operational_issues"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_related_entity_type_related_entity_id_idx" ON "operational_issues"("related_entity_type", "related_entity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_assigned_task_id_idx" ON "operational_issues"("assigned_task_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_impact_type_idx" ON "operational_issues"("impact_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_issues_owner_role_idx" ON "operational_issues"("owner_role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "operational_issues_order_id_automation_key_key" ON "operational_issues"("order_id", "automation_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_assignments_user_id_partner_role_idx" ON "partner_assignments"("user_id", "partner_role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_assignments_workspace_id_idx" ON "partner_assignments"("workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_assignments_revoked_at_idx" ON "partner_assignments"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partner_assignments_workspace_id_user_id_partner_role_key" ON "partner_assignments"("workspace_id", "user_id", "partner_role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inland_deliveries_organisation_id_status_idx" ON "inland_deliveries"("organisation_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inland_deliveries_order_workspace_id_idx" ON "inland_deliveries"("order_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inland_deliveries_trucker_user_id_status_idx" ON "inland_deliveries"("trucker_user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inland_deliveries_customs_case_id_idx" ON "inland_deliveries"("customs_case_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inland_deliveries_shipment_workspace_id_key" ON "inland_deliveries"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inland_delivery_events_inland_delivery_id_created_at_idx" ON "inland_delivery_events"("inland_delivery_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transaction_costs_organisation_id_shipment_workspace_id_idx" ON "transaction_costs"("organisation_id", "shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transaction_costs_shipment_workspace_id_component_type_dele_idx" ON "transaction_costs"("shipment_workspace_id", "component_type", "deleted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landed_cost_calculations_organisation_id_scope_type_scope_i_idx" ON "landed_cost_calculations"("organisation_id", "scope_type", "scope_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landed_cost_calculations_shipment_workspace_id_status_idx" ON "landed_cost_calculations"("shipment_workspace_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landed_cost_calculations_input_hash_idx" ON "landed_cost_calculations"("input_hash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "landed_cost_calculations_scope_type_scope_id_version_key" ON "landed_cost_calculations"("scope_type", "scope_id", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landed_cost_components_calculation_id_component_type_idx" ON "landed_cost_components"("calculation_id", "component_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landed_cost_components_source_type_source_id_idx" ON "landed_cost_components"("source_type", "source_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "delivery_records_order_id_idx" ON "delivery_records"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "delivery_records_shipment_id_idx" ON "delivery_records"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_completions_order_id_key" ON "order_completions"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_completions_status_idx" ON "order_completions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_task_comments_task_id_created_at_idx" ON "operational_task_comments"("task_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customs_cases_organisation_id_status_idx" ON "customs_cases"("organisation_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customs_cases_order_workspace_id_idx" ON "customs_cases"("order_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customs_cases_broker_user_id_idx" ON "customs_cases"("broker_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customs_cases_readiness_status_idx" ON "customs_cases"("readiness_status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "customs_cases_shipment_workspace_id_key" ON "customs_cases"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customs_case_events_customs_case_id_created_at_idx" ON "customs_case_events"("customs_case_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_rules_gtip_code_component_type_active_idx" ON "duty_tax_rules"("gtip_code", "component_type", "active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_rules_effective_from_effective_to_idx" ON "duty_tax_rules"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_rules_active_priority_idx" ON "duty_tax_rules"("active", "priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculations_organisation_id_customs_case_id_idx" ON "duty_tax_calculations"("organisation_id", "customs_case_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculations_customs_case_id_status_idx" ON "duty_tax_calculations"("customs_case_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculations_input_hash_idx" ON "duty_tax_calculations"("input_hash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "duty_tax_calculations_customs_case_id_version_key" ON "duty_tax_calculations"("customs_case_id", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculation_lines_calculation_id_component_type_idx" ON "duty_tax_calculation_lines"("calculation_id", "component_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculation_lines_product_id_idx" ON "duty_tax_calculation_lines"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duty_tax_calculation_lines_purchase_order_line_id_idx" ON "duty_tax_calculation_lines"("purchase_order_line_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_milestones_shipment_workspace_id_idx" ON "shipment_milestones"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_milestones_shipment_workspace_id_status_idx" ON "shipment_milestones"("shipment_workspace_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_milestones_planned_at_idx" ON "shipment_milestones"("planned_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_milestones_estimated_at_idx" ON "shipment_milestones"("estimated_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_milestones_status_idx" ON "shipment_milestones"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_milestones_shipment_workspace_id_type_key" ON "shipment_milestones"("shipment_workspace_id", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_containers_shipment_workspace_id_idx" ON "shipment_containers"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_containers_container_number_idx" ON "shipment_containers"("container_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_shipment_links_shipment_workspace_id_idx" ON "trade_shipment_links"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_shipment_links_order_workspace_id_idx" ON "trade_shipment_links"("order_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trade_shipment_links_purchase_order_id_idx" ON "trade_shipment_links"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trade_shipment_links_purchase_order_id_shipment_workspace_i_key" ON "trade_shipment_links"("purchase_order_id", "shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_line_allocations_purchase_order_id_idx" ON "shipment_line_allocations"("purchase_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_line_allocations_shipment_workspace_id_idx" ON "shipment_line_allocations"("shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_line_allocations_shipment_container_id_idx" ON "shipment_line_allocations"("shipment_container_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_line_allocations_purchase_order_line_id_shipment_w_idx" ON "shipment_line_allocations"("purchase_order_line_id", "shipment_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_organisation_id_name_idx" ON "products"("organisation_id", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_organisation_id_country_of_origin_idx" ON "products"("organisation_id", "country_of_origin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_organisation_id_classification_status_idx" ON "products"("organisation_id", "classification_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_organisation_id_gtip_code_idx" ON "products"("organisation_id", "gtip_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "products_organisation_id_sku_key" ON "products"("organisation_id", "sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_supplier_references_supplier_user_id_idx" ON "product_supplier_references"("supplier_user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_supplier_references_product_id_supplier_user_id_key" ON "product_supplier_references"("product_id", "supplier_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_change_events_product_id_created_at_idx" ON "product_change_events"("product_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_commercial_documents_purchase_order_id_delet_idx" ON "purchase_order_commercial_documents"("purchase_order_id", "deleted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_commercial_documents_purchase_order_id_categ_idx" ON "purchase_order_commercial_documents"("purchase_order_id", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_commercial_documents_storage_key_idx" ON "purchase_order_commercial_documents"("storage_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "direct_po_document_uploads_uploaded_by_id_idx" ON "direct_po_document_uploads"("uploaded_by_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_user_id_idx" ON "workspace_conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_whatsapp_contact_id_idx" ON "workspace_conversation_participants"("whatsapp_contact_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversation_participants_company_id_idx" ON "workspace_conversation_participants"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_conversation_participants_conversation_id_partici_key" ON "workspace_conversation_participants"("conversation_id", "participant_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_contexts_context_type_context_id_idx" ON "conversation_contexts"("context_type", "context_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_contexts_conversation_id_context_type_context__key" ON "conversation_contexts"("conversation_id", "context_type", "context_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_contacts_wa_id_key" ON "whatsapp_contacts"("wa_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_phone_number_idx" ON "whatsapp_contacts"("phone_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_user_id_idx" ON "whatsapp_contacts"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_last_message_at_idx" ON "whatsapp_conversations"("last_message_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_assignee_user_id_idx" ON "whatsapp_conversations"("assignee_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_status_idx" ON "whatsapp_conversations"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_conversations_contact_id_phone_number_id_key" ON "whatsapp_conversations"("contact_id", "phone_number_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_meta_message_id_key" ON "whatsapp_messages"("meta_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_messages_meta_message_id_idx" ON "whatsapp_messages"("meta_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_message_statuses_message_id_occurred_at_idx" ON "whatsapp_message_statuses"("message_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_business_connections_buyer_id_key" ON "whatsapp_business_connections"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_business_connections_phone_number_id_key" ON "whatsapp_business_connections"("phone_number_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_business_connections_status_idx" ON "whatsapp_business_connections"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_business_connections_waba_id_idx" ON "whatsapp_business_connections"("waba_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_connection_templates_connection_id_purpose_is_defa_idx" ON "whatsapp_connection_templates"("connection_id", "purpose", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_connection_templates_connection_id_template_name_t_key" ON "whatsapp_connection_templates"("connection_id", "template_name", "template_language");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_unresolved_webhook_events_meta_message_id_key" ON "whatsapp_unresolved_webhook_events"("meta_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_unresolved_webhook_events_phone_number_id_created__idx" ON "whatsapp_unresolved_webhook_events"("phone_number_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_unresolved_webhook_events_buyer_id_created_at_idx" ON "whatsapp_unresolved_webhook_events"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_unresolved_webhook_events_resolved_at_idx" ON "whatsapp_unresolved_webhook_events"("resolved_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_connection_audit_logs_buyer_id_created_at_idx" ON "whatsapp_connection_audit_logs"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_connection_audit_logs_action_created_at_idx" ON "whatsapp_connection_audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_industries_slug_key" ON "catalog_industries"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_industries_status_sort_order_idx" ON "catalog_industries"("status", "sort_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organisation_category_interests_catalog_category_id_idx" ON "organisation_category_interests"("catalog_category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organisation_category_interests_organisation_id_idx" ON "organisation_category_interests"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "organisation_category_interests_organisation_id_catalog_cat_key" ON "organisation_category_interests"("organisation_id", "catalog_category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_packaging_product_id_status_sort_order_idx" ON "catalog_packaging"("product_id", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_packaging_product_id_slug_key" ON "catalog_packaging"("product_id", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mc_organization_status_history_workspace_id_created_at_idx" ON "mc_organization_status_history"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mc_organization_events_workspace_id_created_at_idx" ON "mc_organization_events"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mc_organization_events_workspace_id_source_module_created_a_idx" ON "mc_organization_events"("workspace_id", "source_module", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mc_organization_events_workspace_id_dedupe_key_key" ON "mc_organization_events"("workspace_id", "dedupe_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mc_procurement_status_history_workspace_id_created_at_idx" ON "mc_procurement_status_history"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mc_internal_notes_workspace_id_created_at_idx" ON "mc_internal_notes"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "messaging_outbox_events_idempotency_key_key" ON "messaging_outbox_events"("idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messaging_outbox_events_status_available_at_idx" ON "messaging_outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messaging_outbox_events_conversation_id_idx" ON "messaging_outbox_events"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "messaging_idempotency_keys_key_hash_key" ON "messaging_idempotency_keys"("key_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messaging_idempotency_keys_expires_at_idx" ON "messaging_idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_academy_profiles_user_id_key" ON "workspace_academy_profiles"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_academy_guide_progress_user_id_status_idx" ON "workspace_academy_guide_progress"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_academy_guide_progress_user_id_guide_id_key" ON "workspace_academy_guide_progress"("user_id", "guide_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_academy_task_progress_user_id_status_idx" ON "workspace_academy_task_progress"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_academy_task_progress_user_id_task_id_key" ON "workspace_academy_task_progress"("user_id", "task_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_academy_article_views_user_id_last_viewed_at_idx" ON "workspace_academy_article_views"("user_id", "last_viewed_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_academy_article_views_user_id_article_id_key" ON "workspace_academy_article_views"("user_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "operational_automation_rules_key_key" ON "operational_automation_rules"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_automation_rules_enabled_priority_idx" ON "operational_automation_rules"("enabled", "priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_task_templates_enabled_idx" ON "operational_task_templates"("enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_task_templates_automation_trigger_idx" ON "operational_task_templates"("automation_trigger");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_milestone_templates_enabled_sequence_idx" ON "operational_milestone_templates"("enabled", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "operational_milestone_templates_type_key" ON "operational_milestone_templates"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_config_audits_action_created_at_idx" ON "operational_config_audits"("action", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operational_config_audits_entity_type_entity_id_idx" ON "operational_config_audits"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_categories_industry_id_status_sort_order_idx" ON "catalog_categories"("industry_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "freight_requests_organization_workspace_id_idx" ON "freight_requests"("organization_workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mixed_container_details_procurement_request_ref_key" ON "mixed_container_details"("procurement_request_ref");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mixed_container_details_commercial_proposal_ref_key" ON "mixed_container_details"("commercial_proposal_ref");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mixed_container_details_organization_ref_key" ON "mixed_container_details"("organization_ref");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixed_container_details_assigned_manager_id_idx" ON "mixed_container_details"("assigned_manager_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixed_container_details_pricing_requested_at_idx" ON "mixed_container_details"("pricing_requested_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixed_container_details_organization_status_idx" ON "mixed_container_details"("organization_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixed_container_details_organization_started_at_idx" ON "mixed_container_details"("organization_started_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixed_container_details_order_group_id_idx" ON "mixed_container_details"("order_group_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_workspaces_origin_idx" ON "order_workspaces"("origin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_lines_rfq_line_item_id_idx" ON "purchase_order_lines"("rfq_line_item_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_lines_quotation_line_id_idx" ON "purchase_order_lines"("quotation_line_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_lines_product_id_idx" ON "purchase_order_lines"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_organization_workspace_id_idx" ON "purchase_orders"("organization_workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_source_idx" ON "purchase_orders"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_organization_workspace_id_status_idx" ON "purchase_orders"("organization_workspace_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_organization_workspace_id_source_idx" ON "purchase_orders"("organization_workspace_id", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_buyer_id_created_at_idx" ON "purchase_orders"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_id_created_at_idx" ON "purchase_orders"("supplier_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfq_line_items_workspace_id_award_status_idx" ON "rfq_line_items"("workspace_id", "award_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_workspaces_booking_status_idx" ON "shipment_workspaces"("booking_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_workspaces_freight_request_id_idx" ON "shipment_workspaces"("freight_request_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shipment_workspaces_freight_offer_id_idx" ON "shipment_workspaces"("freight_offer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_phone_verification_status_idx" ON "users"("phone_verification_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversations_last_message_at_idx" ON "workspace_conversations"("last_message_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversations_assigned_user_id_idx" ON "workspace_conversations"("assigned_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_conversations_status_is_archived_idx" ON "workspace_conversations"("status", "is_archived");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_messages_channel_source_created_at_idx" ON "workspace_messages"("channel_source", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_messages_audience_scope_idx" ON "workspace_messages"("audience_scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_messages_external_message_id_idx" ON "workspace_messages"("external_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workspace_messages_whatsapp_message_id_idx" ON "workspace_messages"("whatsapp_message_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_conversation_id_author_user_id_client_me_key" ON "workspace_messages"("conversation_id", "author_user_id", "client_message_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_messages_legacy_source_legacy_id_key" ON "workspace_messages"("legacy_source", "legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces"("slug");

-- AddForeignKey
ALTER TABLE "phone_verification_requests" ADD CONSTRAINT "phone_verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_awards" ADD CONSTRAINT "rfq_line_awards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_awards" ADD CONSTRAINT "rfq_line_awards_rfq_line_item_id_fkey" FOREIGN KEY ("rfq_line_item_id") REFERENCES "rfq_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_awards" ADD CONSTRAINT "rfq_line_awards_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_awards" ADD CONSTRAINT "rfq_line_awards_supplier_po_spawn_id_fkey" FOREIGN KEY ("supplier_po_spawn_id") REFERENCES "rfq_supplier_po_spawns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_supplier_po_spawns" ADD CONSTRAINT "rfq_supplier_po_spawns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_workspace_id_fkey" FOREIGN KEY ("inspection_workspace_id") REFERENCES "inspection_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defects" ADD CONSTRAINT "inspection_defects_inspection_workspace_id_fkey" FOREIGN KEY ("inspection_workspace_id") REFERENCES "inspection_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_ncrs" ADD CONSTRAINT "inspection_ncrs_inspection_workspace_id_fkey" FOREIGN KEY ("inspection_workspace_id") REFERENCES "inspection_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inland_deliveries" ADD CONSTRAINT "inland_deliveries_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inland_delivery_events" ADD CONSTRAINT "inland_delivery_events_inland_delivery_id_fkey" FOREIGN KEY ("inland_delivery_id") REFERENCES "inland_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_costs" ADD CONSTRAINT "transaction_costs_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_calculations" ADD CONSTRAINT "landed_cost_calculations_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_components" ADD CONSTRAINT "landed_cost_components_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "landed_cost_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_task_comments" ADD CONSTRAINT "operational_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "operational_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_cases" ADD CONSTRAINT "customs_cases_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_case_events" ADD CONSTRAINT "customs_case_events_customs_case_id_fkey" FOREIGN KEY ("customs_case_id") REFERENCES "customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_tax_calculations" ADD CONSTRAINT "duty_tax_calculations_customs_case_id_fkey" FOREIGN KEY ("customs_case_id") REFERENCES "customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_tax_calculation_lines" ADD CONSTRAINT "duty_tax_calculation_lines_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "duty_tax_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_containers" ADD CONSTRAINT "shipment_containers_shipment_workspace_id_fkey" FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line_allocations" ADD CONSTRAINT "shipment_line_allocations_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line_allocations" ADD CONSTRAINT "shipment_line_allocations_shipment_container_id_fkey" FOREIGN KEY ("shipment_container_id") REFERENCES "shipment_containers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_rfq_line_item_id_fkey" FOREIGN KEY ("rfq_line_item_id") REFERENCES "rfq_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_quotation_line_id_fkey" FOREIGN KEY ("quotation_line_id") REFERENCES "quotation_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_supplier_references" ADD CONSTRAINT "product_supplier_references_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_change_events" ADD CONSTRAINT "product_change_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_commercial_documents" ADD CONSTRAINT "purchase_order_commercial_documents_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_conversation_participants" ADD CONSTRAINT "workspace_conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_conversation_participants" ADD CONSTRAINT "workspace_conversation_participants_whatsapp_contact_id_fkey" FOREIGN KEY ("whatsapp_contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_contexts" ADD CONSTRAINT "conversation_contexts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_statuses" ADD CONSTRAINT "whatsapp_message_statuses_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_business_connections" ADD CONSTRAINT "whatsapp_business_connections_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connection_templates" ADD CONSTRAINT "whatsapp_connection_templates_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_business_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connection_audit_logs" ADD CONSTRAINT "whatsapp_connection_audit_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_business_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "catalog_industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_category_interests" ADD CONSTRAINT "organisation_category_interests_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_category_interests" ADD CONSTRAINT "organisation_category_interests_catalog_category_id_fkey" FOREIGN KEY ("catalog_category_id") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_packaging" ADD CONSTRAINT "catalog_packaging_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_packaging" ADD CONSTRAINT "catalog_packaging_packing_type_id_fkey" FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mc_organization_status_history" ADD CONSTRAINT "mc_organization_status_history_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mc_organization_events" ADD CONSTRAINT "mc_organization_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mc_procurement_status_history" ADD CONSTRAINT "mc_procurement_status_history_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mc_internal_notes" ADD CONSTRAINT "mc_internal_notes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_lines" ADD CONSTRAINT "container_lines_catalog_packaging_id_fkey" FOREIGN KEY ("catalog_packaging_id") REFERENCES "catalog_packaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academy_profiles" ADD CONSTRAINT "workspace_academy_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academy_guide_progress" ADD CONSTRAINT "workspace_academy_guide_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academy_task_progress" ADD CONSTRAINT "workspace_academy_task_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academy_article_views" ADD CONSTRAINT "workspace_academy_article_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

