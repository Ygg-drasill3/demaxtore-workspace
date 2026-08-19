-- Add interest_areas column to organisations (schema drift fix).
-- Column exists in schema.prisma but was missing from migrations.

ALTER TABLE "organisations"
ADD COLUMN IF NOT EXISTS "interest_areas" TEXT[] NOT NULL DEFAULT '{}';
