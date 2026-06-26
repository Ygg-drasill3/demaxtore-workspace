-- Sprint 9A — Guided onboarding progress tracking (no FSM changes)

CREATE TABLE "user_onboarding_progress" (
    "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"               UUID NOT NULL,
    "role"                  "Role" NOT NULL,
    "completed_steps"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "current_step"          TEXT,
    "completed"             BOOLEAN NOT NULL DEFAULT false,
    "first_trade_completed" BOOLEAN NOT NULL DEFAULT false,
    "tour_completed"        BOOLEAN NOT NULL DEFAULT false,
    "tour_completed_at"     TIMESTAMP(3),
    "started_at"            TIMESTAMP(3),
    "completed_at"          TIMESTAMP(3),
    "first_trade_at"        TIMESTAMP(3),
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_onboarding_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_onboarding_progress_user_id_key" ON "user_onboarding_progress"("user_id");
CREATE INDEX "user_onboarding_progress_role_idx" ON "user_onboarding_progress"("role");
CREATE INDEX "user_onboarding_progress_completed_idx" ON "user_onboarding_progress"("completed");
CREATE INDEX "user_onboarding_progress_first_trade_idx" ON "user_onboarding_progress"("first_trade_completed");

ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "user_onboarding_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
