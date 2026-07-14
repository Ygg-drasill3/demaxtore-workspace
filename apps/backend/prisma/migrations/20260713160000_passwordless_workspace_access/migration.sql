-- Passwordless Workspace Access™
CREATE TABLE "passwordless_access_tokens" (
    "id" UUID NOT NULL,
    "jti" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "audit_workspace_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "single_use" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passwordless_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passwordless_access_logs" (
    "id" UUID NOT NULL,
    "token_id" UUID,
    "user_id" UUID,
    "workspace_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passwordless_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "passwordless_access_tokens_jti_key" ON "passwordless_access_tokens"("jti");
CREATE UNIQUE INDEX "passwordless_access_tokens_token_hash_key" ON "passwordless_access_tokens"("token_hash");
CREATE INDEX "passwordless_access_tokens_user_id_workspace_id_idx" ON "passwordless_access_tokens"("user_id", "workspace_id");
CREATE INDEX "passwordless_access_tokens_expires_at_idx" ON "passwordless_access_tokens"("expires_at");

CREATE INDEX "passwordless_access_logs_workspace_id_created_at_idx" ON "passwordless_access_logs"("workspace_id", "created_at");
CREATE INDEX "passwordless_access_logs_user_id_created_at_idx" ON "passwordless_access_logs"("user_id", "created_at");

ALTER TABLE "passwordless_access_tokens" ADD CONSTRAINT "passwordless_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passwordless_access_logs" ADD CONSTRAINT "passwordless_access_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "passwordless_access_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
