-- Sprint 3A — CommodityBid Runtime Foundation

CREATE TABLE "commoditybid_details" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "product_category" TEXT,
    "description" TEXT NOT NULL,
    "target_market" TEXT,
    "last_rejection_reason" TEXT,
    "last_rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commoditybid_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commoditybid_details_workspace_id_key" ON "commoditybid_details"("workspace_id");

CREATE TABLE "commoditybid_lots" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lot_number" INTEGER NOT NULL,
    "commodity" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "incoterms" TEXT,
    "delivery_window" TEXT,
    "notes" TEXT,
    "no_award_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commoditybid_lots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commoditybid_lots_workspace_id_lot_number_key" ON "commoditybid_lots"("workspace_id", "lot_number");
CREATE INDEX "commoditybid_lots_workspace_id_idx" ON "commoditybid_lots"("workspace_id");

CREATE TABLE "commoditybid_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "bidder_code" TEXT NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "removed_by_id" UUID,
    CONSTRAINT "commoditybid_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commoditybid_invitations_workspace_id_supplier_user_id_key" ON "commoditybid_invitations"("workspace_id", "supplier_user_id");
CREATE UNIQUE INDEX "commoditybid_invitations_workspace_id_bidder_code_key" ON "commoditybid_invitations"("workspace_id", "bidder_code");
CREATE INDEX "commoditybid_invitations_workspace_id_idx" ON "commoditybid_invitations"("workspace_id");

CREATE TABLE "commoditybid_submissions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "lead_time_days" INTEGER,
    "moq" INTEGER,
    "payment_terms" TEXT,
    "delivery_terms" TEXT,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commoditybid_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commoditybid_submissions_lot_id_supplier_user_id_key" ON "commoditybid_submissions"("lot_id", "supplier_user_id");
CREATE INDEX "commoditybid_submissions_workspace_id_idx" ON "commoditybid_submissions"("workspace_id");
CREATE INDEX "commoditybid_submissions_lot_id_idx" ON "commoditybid_submissions"("lot_id");

CREATE TABLE "commoditybid_awards" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "withdraw_reason" TEXT,
    "sla_deadline_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commoditybid_awards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commoditybid_awards_workspace_id_idx" ON "commoditybid_awards"("workspace_id");
CREATE INDEX "commoditybid_awards_lot_id_idx" ON "commoditybid_awards"("lot_id");
CREATE INDEX "commoditybid_awards_status_sla_deadline_at_idx" ON "commoditybid_awards"("status", "sla_deadline_at");

CREATE UNIQUE INDEX "commoditybid_awards_active_unique"
  ON "commoditybid_awards" ("lot_id", "supplier_user_id")
  WHERE status IN ('DRAFT', 'PUBLISHED', 'ACCEPTED');

ALTER TABLE "commoditybid_details" ADD CONSTRAINT "commoditybid_details_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_lots" ADD CONSTRAINT "commoditybid_lots_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_invitations" ADD CONSTRAINT "commoditybid_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_submissions" ADD CONSTRAINT "commoditybid_submissions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_submissions" ADD CONSTRAINT "commoditybid_submissions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "commoditybid_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_awards" ADD CONSTRAINT "commoditybid_awards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_awards" ADD CONSTRAINT "commoditybid_awards_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "commoditybid_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commoditybid_awards" ADD CONSTRAINT "commoditybid_awards_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "commoditybid_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sprint 2.5 RLS template (inactive until Sprint 2.5)
-- ALTER TABLE commoditybid_submissions ENABLE ROW LEVEL SECURITY;
