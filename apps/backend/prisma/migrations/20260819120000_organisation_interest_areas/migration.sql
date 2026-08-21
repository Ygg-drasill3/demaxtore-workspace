-- Schema drift fix: columns/enums that exist in schema.prisma but were missing
-- from migration files. This migration is safe to run multiple times (IF NOT EXISTS / guards).

-- ── Enums ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "OrderWorkspaceOrigin" AS ENUM ('RFQ','DIRECT_PO','REORDER','API','LEGACY','COMMODITY_BID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PurchaseOrderSource" AS ENUM ('RFQ','DIRECT','REORDER','API','LEGACY','COMMODITY_BID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new Role values (schema drift: ORIGIN_AGENT, CUSTOMS_BROKER, TRUCKER)
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ORIGIN_AGENT';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CUSTOMS_BROKER';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TRUCKER';
EXCEPTION WHEN others THEN NULL; END $$;

-- ── organisations: add missing columns ─────────────────────────────────────────
ALTER TABLE "organisations"
ADD COLUMN IF NOT EXISTS "interest_areas"       TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "catalog_external_url" TEXT;

-- ── purchase_orders: po_manual_upload columns skipped because table didn't exist yet ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchase_orders') THEN
    ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'RFQ',
      ADD COLUMN IF NOT EXISTS document_url TEXT,
      ADD COLUMN IF NOT EXISTS document_file_name VARCHAR(500);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_details') THEN
    ALTER TABLE rfq_details
      ADD COLUMN IF NOT EXISTS po_file_url TEXT;
  END IF;
END $$;

-- ── order_workspaces: add origin column (Sprint 27 dual-entry) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_workspaces' AND column_name = 'origin'
  ) THEN
    ALTER TABLE "order_workspaces"
      ADD COLUMN "origin" "OrderWorkspaceOrigin" NOT NULL DEFAULT 'RFQ';
    -- Also make parent columns nullable if they were made NOT NULL in the original migration
    ALTER TABLE "order_workspaces"
      ALTER COLUMN "parent_workspace_id" DROP NOT NULL,
      ALTER COLUMN "parent_workspace_type" DROP NOT NULL;
  END IF;
END $$;

-- purchase_orders.source type migration is handled in 20260819180000_comprehensive_schema_drift_fix
