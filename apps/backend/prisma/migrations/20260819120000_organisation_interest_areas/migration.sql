-- Schema drift fix: add columns that exist in schema.prisma but were missing
-- from any migration file (interest_areas, catalog_external_url).

ALTER TABLE "organisations"
ADD COLUMN IF NOT EXISTS "interest_areas"      TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "catalog_external_url" TEXT;
