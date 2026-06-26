-- Sprint 15C — Unified Document Center versioning fields
ALTER TABLE "trade_documents" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "trade_documents" ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
ALTER TABLE "trade_documents" ADD COLUMN IF NOT EXISTS "reviewed_by_id" UUID;
ALTER TABLE "trade_documents" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ;
ALTER TABLE "trade_documents" ADD COLUMN IF NOT EXISTS "trade_root_id" UUID;

CREATE TABLE IF NOT EXISTS "trade_document_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trade_document_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "file_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_latest" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "trade_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trade_document_versions_trade_document_id_idx" ON "trade_document_versions"("trade_document_id");

DO $$ BEGIN
  ALTER TABLE "trade_document_versions" ADD CONSTRAINT "trade_document_versions_trade_document_id_fkey"
    FOREIGN KEY ("trade_document_id") REFERENCES "trade_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
