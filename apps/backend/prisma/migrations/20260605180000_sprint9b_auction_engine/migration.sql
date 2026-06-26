-- Sprint 9B — CommodityBid Auction Engine

ALTER TABLE commoditybid_details
  ADD COLUMN IF NOT EXISTS auction_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auction_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS invitation_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auction_rules JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lowest_bid_amount DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS lowest_bid_supplier_id UUID,
  ADD COLUMN IF NOT EXISTS winner_submission_id UUID;

ALTER TABLE commoditybid_invitations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'INVITED',
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS commoditybid_bid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES commoditybid_lots(id) ON DELETE CASCADE,
  supplier_user_id UUID NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cb_bid_events_ws ON commoditybid_bid_events(workspace_id, created_at DESC);

-- Legacy state migration (bypass FSM guard for one-time data migration)
DO $$
BEGIN
  PERFORM set_config('app.fsm_authorised', 'true', true);
  UPDATE workspaces SET state = 'SCHEDULED' WHERE type = 'COMMODITYBID' AND state = 'BID_SUBMITTED';
  UPDATE workspaces SET state = 'INVITING_SUPPLIERS' WHERE type = 'COMMODITYBID' AND state = 'SUPPLIERS_INVITED';
  UPDATE workspaces SET state = 'LIVE' WHERE type = 'COMMODITYBID' AND state = 'BID_OPEN';
  UPDATE workspaces SET state = 'CLOSED' WHERE type = 'COMMODITYBID' AND state = 'BID_CLOSED';
  UPDATE workspaces SET state = 'WINNER_IDENTIFIED' WHERE type = 'COMMODITYBID' AND state = 'UNDER_EVALUATION';
  UPDATE workspaces SET state = 'AWAITING_BUYER_APPROVAL' WHERE type = 'COMMODITYBID' AND state = 'AWARDS_PUBLISHED';
  UPDATE workspaces SET state = 'APPROVED' WHERE type = 'COMMODITYBID' AND state = 'ACCEPTANCE_COMPLETE';
  UPDATE workspaces SET state = 'ORDERS_SPAWNED' WHERE type = 'COMMODITYBID' AND state = 'CONTRACTS_ISSUED';
END $$;
