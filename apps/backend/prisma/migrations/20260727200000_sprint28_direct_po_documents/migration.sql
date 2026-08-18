-- Sprint 28 — Direct PO document staging uploads
CREATE TABLE "direct_po_document_uploads" (
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

CREATE INDEX "direct_po_document_uploads_uploaded_by_id_idx" ON "direct_po_document_uploads"("uploaded_by_id");
