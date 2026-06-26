-- Sprint 9B — scale indexes (no FSM / business rule changes)

CREATE INDEX IF NOT EXISTS "workspaces_type_state_deadline_at_idx"
  ON "workspaces"("type", "state", "deadline_at");

CREATE INDEX IF NOT EXISTS "workspaces_type_state_updated_at_idx"
  ON "workspaces"("type", "state", "updated_at");

CREATE INDEX IF NOT EXISTS "workspaces_type_state_proforma_sla_deadline_at_idx"
  ON "workspaces"("type", "state", "proforma_sla_deadline_at");

CREATE INDEX IF NOT EXISTS "job_executions_job_name_started_at_idx"
  ON "job_executions"("job_name", "started_at");

CREATE INDEX IF NOT EXISTS "job_executions_status_started_at_idx"
  ON "job_executions"("status", "started_at");
