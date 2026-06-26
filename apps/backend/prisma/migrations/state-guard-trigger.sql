-- =============================================================================
-- DEPRECATED — use Prisma migration instead:
--   prisma/migrations/20260606120000_sprint39_state_guard/migration.sql
-- Applied automatically by: npx prisma migrate deploy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) Partial unique index: one ACTIVE supplier assignment per (workspace, supplier)
--     Prisma can't express WHERE clauses on unique indexes yet.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX supplier_assignments_active_unique
  ON supplier_assignments (workspace_id, supplier_user_id)
  WHERE removed_at IS NULL;

-- -----------------------------------------------------------------------------
-- (2) State-guard trigger: workspaces.state can only change via applyTransition()
--     applyTransition() must SET LOCAL app.fsm_authorised = 'true' inside its tx.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- (3) Currency immutability after publish (FSM Decision #11)
--     workspaces.currency can never change once state has left the pre-open phase.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- (4) Audit log append-only — block UPDATE and DELETE for non-superuser app role
--     Note: requires the application to connect as a non-superuser DB role.
-- -----------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
-- Re-grant minimum CRUD subset:
GRANT INSERT, SELECT ON audit_logs TO dmx;
-- (No UPDATE / DELETE grants — append-only.)

-- -----------------------------------------------------------------------------
-- (5) Timeline events append-only (similar guard)
-- -----------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON timeline_events FROM PUBLIC;
GRANT INSERT, SELECT ON timeline_events TO dmx;

-- -----------------------------------------------------------------------------
-- (6) Deadline-extension counter sanity (FSM Decision #5: max 2× / +14 days)
--     Belt-and-braces on top of the app-level check.
-- -----------------------------------------------------------------------------
ALTER TABLE workspaces
  ADD CONSTRAINT chk_deadline_extension_count
  CHECK (deadline_extension_count <= 2),
  ADD CONSTRAINT chk_deadline_extension_total_days
  CHECK (deadline_extension_total_days <= 14);

-- -----------------------------------------------------------------------------
-- (7) RLS placeholder (Sprint 2.5 — leave commented for Sprint 2)
-- -----------------------------------------------------------------------------
-- ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY bids_owner_can_read ON bids FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM workspace_participants wp
--       WHERE wp.workspace_id = bids.workspace_id
--         AND wp.user_id = current_setting('app.current_user_id')::uuid
--         AND wp.participant_role IN ('OWNER', 'OPERATOR')
--     )
--   );
-- CREATE POLICY bids_supplier_can_read_own ON bids FOR SELECT
--   USING ( bids.supplier_user_id = current_setting('app.current_user_id')::uuid );
