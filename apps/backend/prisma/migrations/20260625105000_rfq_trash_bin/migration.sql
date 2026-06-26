ALTER TABLE "workspaces"
ADD COLUMN "trashed_at" TIMESTAMP(3);

CREATE INDEX "workspaces_type_trashed_at_created_at_idx"
ON "workspaces"("type", "trashed_at", "created_at");
