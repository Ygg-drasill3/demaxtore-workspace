-- Sprint 9B — scale indexes (no FSM / business rule changes)

CREATE INDEX IF NOT EXISTS "workspaces_type_state_deadline_at_idx"
  ON "workspaces"("type", "state", "deadline_at");

CREATE INDEX IF NOT EXISTS "workspaces_type_state_updated_at_idx"
  ON "workspaces"("type", "state", "updated_at");

CREATE INDEX IF NOT EXISTS "workspaces_type_state_proforma_sla_deadline_at_idx"
  ON "workspaces"("type", "state", "proforma_sla_deadline_at");

-- This migration can run in environments where the Sprint 8A table creation
-- (job_executions) wasn't applied yet. Guard index creation to keep migrations idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'job_executions'
  ) THEN
    CREATE INDEX IF NOT EXISTS "job_executions_job_name_started_at_idx"
      ON "job_executions"("job_name", "started_at");

    CREATE INDEX IF NOT EXISTS "job_executions_status_started_at_idx"
      ON "job_executions"("status", "started_at");
  END IF;
END $$;
