-- Performance indexes for SLA queries, onboarding stalled scan, and workspace funnel counts

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

CREATE INDEX IF NOT EXISTS "user_onboarding_progress_stalled_idx"
  ON "user_onboarding_progress"("completed", "first_trade_completed", "updated_at");

CREATE INDEX IF NOT EXISTS "workspaces_type_created_at_idx" ON "workspaces"("type", "created_at");
