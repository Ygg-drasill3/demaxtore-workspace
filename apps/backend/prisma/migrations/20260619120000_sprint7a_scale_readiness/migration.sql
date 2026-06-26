-- Sprint 7A — Commercial scale readiness (account ownership)

CREATE TABLE IF NOT EXISTS "account_ownership" (
  "organisation_id" UUID NOT NULL,
  "operations_user_id" UUID,
  "sales_user_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_ownership_pkey" PRIMARY KEY ("organisation_id")
);

CREATE INDEX IF NOT EXISTS "account_ownership_operations_user_id_idx" ON "account_ownership"("operations_user_id");
CREATE INDEX IF NOT EXISTS "account_ownership_sales_user_id_idx" ON "account_ownership"("sales_user_id");
