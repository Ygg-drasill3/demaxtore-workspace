-- Sprint 3A.1 — RLS on commoditybid_submissions (sealed-bid SELECT enforcement)

ALTER TABLE commoditybid_submissions ENABLE ROW LEVEL SECURITY;

-- Buyer OWNER / workspace OPERATOR / platform ADMIN may read all submissions on their workspaces
CREATE POLICY cb_submissions_workspace_read ON commoditybid_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_participants wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.workspace_id = commoditybid_submissions.workspace_id
        AND wp.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND (
          wp."participantRole" IN ('OWNER', 'OPERATOR')
          OR u.role = 'ADMIN'
        )
    )
  );

-- Suppliers may only read their own submission rows
CREATE POLICY cb_submissions_supplier_own ON commoditybid_submissions
  FOR SELECT
  USING (
    supplier_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- Writes remain application-layer (FSM); no broad INSERT/UPDATE policies in 3A.1
