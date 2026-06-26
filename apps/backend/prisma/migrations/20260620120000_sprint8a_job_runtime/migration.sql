-- Sprint 8A — Enterprise job runtime & backup verification

CREATE TABLE IF NOT EXISTS "job_executions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_name" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "finished_at" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_executions_job_name_idx" ON "job_executions"("job_name");
CREATE INDEX IF NOT EXISTS "job_executions_status_idx" ON "job_executions"("status");
CREATE INDEX IF NOT EXISTS "job_executions_created_at_idx" ON "job_executions"("created_at");

CREATE TABLE IF NOT EXISTS "backup_verification_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "check_type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "notes" TEXT,
  "verified_by" UUID,
  "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backup_verification_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "backup_verification_records_check_type_idx" ON "backup_verification_records"("check_type");
CREATE INDEX IF NOT EXISTS "backup_verification_records_verified_at_idx" ON "backup_verification_records"("verified_at");

DO $$ BEGIN
  ALTER TABLE "backup_verification_records"
    ADD CONSTRAINT "backup_verification_records_verified_by_fkey"
    FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
