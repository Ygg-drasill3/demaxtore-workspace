CREATE TABLE "supplier_line_scopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "rfq_line_item_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_line_scopes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_line_scopes_workspace_id_supplier_user_id_rfq_line_item_id_key"
    ON "supplier_line_scopes"("workspace_id", "supplier_user_id", "rfq_line_item_id");

CREATE INDEX "supplier_line_scopes_workspace_id_supplier_user_id_idx"
    ON "supplier_line_scopes"("workspace_id", "supplier_user_id");

ALTER TABLE "supplier_line_scopes"
    ADD CONSTRAINT "supplier_line_scopes_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
