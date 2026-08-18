-- Sprint 04 — SmartContainer Commercial Proposal Management

ALTER TABLE "mixed_container_details"
  ADD COLUMN "commercial_proposal_ref" TEXT;

CREATE UNIQUE INDEX "mixed_container_details_commercial_proposal_ref_key"
  ON "mixed_container_details"("commercial_proposal_ref");

ALTER TABLE "mc_offer_lines"
  ADD COLUMN "brand" TEXT;

ALTER TABLE "mc_procurement_quotes"
  ADD COLUMN "brand" TEXT;
