-- Sprint 43R: organisation-level buyer commercial profile.
-- Default INTERNATIONAL so existing buyers keep the pre-Sprint-43 product.
-- This is not authorization and is independent of shipment destination country.

ALTER TABLE "organisations"
ADD COLUMN "buyer_operating_model" TEXT NOT NULL DEFAULT 'INTERNATIONAL';

-- Authoritative Turkey Importer fixture tenant owned by
-- prisma/seed-pilot-empty-users.ts (ORG_IDS.buyer).
-- Seed-owned configuration only — runtime UX must not branch on this UUID.
UPDATE "organisations"
SET "buyer_operating_model" = 'TURKEY_IMPORTER'
WHERE "id" = '00000000-0000-0000-0000-00000000e001';
