-- Sprint 5C — Trade documentation & compliance

CREATE TABLE "document_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_requirements_workspace_type_workspace_id_document_ty_key"
    ON "document_requirements"("workspace_type", "workspace_id", "document_type");
CREATE INDEX "document_requirements_workspace_id_idx" ON "document_requirements"("workspace_id");

CREATE TABLE "trade_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "owner_role" TEXT NOT NULL,
    "uploaded_by" UUID,
    "file_id" TEXT,
    "file_name" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trade_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_documents_workspace_type_workspace_id_document_type_key"
    ON "trade_documents"("workspace_type", "workspace_id", "document_type");
CREATE INDEX "trade_documents_workspace_id_idx" ON "trade_documents"("workspace_id");
CREATE INDEX "trade_documents_status_idx" ON "trade_documents"("status");

CREATE TABLE "document_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "reviewed_by" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_reviews_document_id_idx" ON "document_reviews"("document_id");

ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "trade_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
