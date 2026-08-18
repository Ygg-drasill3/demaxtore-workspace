-- Friendly RFQ workspace URLs: /workspace/rfq/{slug}
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces"("slug");
