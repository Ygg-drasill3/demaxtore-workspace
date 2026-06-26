-- Production hardening indexes: PasswordResetToken, TelemetryEvent, IdempotencyKey
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "telemetry_events_workspace_id_occurred_at_idx" ON "telemetry_events"("workspace_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");
