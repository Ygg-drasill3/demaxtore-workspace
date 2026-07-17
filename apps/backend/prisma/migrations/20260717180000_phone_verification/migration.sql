-- Phone verification for messaging gate
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verification_status" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_by" UUID;

CREATE INDEX IF NOT EXISTS "users_phone_verification_status_idx" ON "users"("phone_verification_status");

CREATE TABLE IF NOT EXISTS "phone_verification_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" UUID,

    CONSTRAINT "phone_verification_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "phone_verification_requests_status_submitted_at_idx"
  ON "phone_verification_requests"("status", "submitted_at");
CREATE INDEX IF NOT EXISTS "phone_verification_requests_user_id_submitted_at_idx"
  ON "phone_verification_requests"("user_id", "submitted_at");

ALTER TABLE "phone_verification_requests" ADD CONSTRAINT "phone_verification_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
