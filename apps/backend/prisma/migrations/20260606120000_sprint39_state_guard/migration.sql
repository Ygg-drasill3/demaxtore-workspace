-- Sprint 3.9 — State guard & DB invariants (formerly manual state-guard-trigger.sql)

CREATE UNIQUE INDEX IF NOT EXISTS supplier_assignments_active_unique
  ON supplier_assignments (workspace_id, supplier_user_id)
  WHERE removed_at IS NULL;

CREATE OR REPLACE FUNCTION block_direct_state_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.fsm_authorised', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'workspaces.state can only be changed via applyTransition()';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_state_guard ON workspaces;
CREATE TRIGGER workspaces_state_guard
  BEFORE UPDATE OF state ON workspaces
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION block_direct_state_change();

CREATE OR REPLACE FUNCTION block_currency_change_after_publish() RETURNS trigger AS $$
BEGIN
  IF OLD.currency IS DISTINCT FROM NEW.currency
     AND OLD.state NOT IN ('RFQ_DRAFT', 'RFQ_SUBMITTED', 'SUPPLIERS_ASSIGNED',
                           'BID_DRAFT', 'BID_SUBMITTED', 'SUPPLIERS_INVITED') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'workspaces.currency is immutable after publish';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_currency_guard ON workspaces;
CREATE TRIGGER workspaces_currency_guard
  BEFORE UPDATE OF currency ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION block_currency_change_after_publish();

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON timeline_events FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dmx') THEN
    GRANT INSERT, SELECT ON audit_logs TO dmx;
    GRANT INSERT, SELECT ON timeline_events TO dmx;
  END IF;
END $$;

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS chk_deadline_extension_count;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS chk_deadline_extension_total_days;
ALTER TABLE workspaces
  ADD CONSTRAINT chk_deadline_extension_count
  CHECK (deadline_extension_count <= 2),
  ADD CONSTRAINT chk_deadline_extension_total_days
  CHECK (deadline_extension_total_days <= 14);
