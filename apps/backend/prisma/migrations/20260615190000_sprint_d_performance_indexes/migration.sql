-- Sprint D — query performance indexes for dashboards / exception hub / lists
-- Guard: some tables may not exist when migrations run in CI (timestamp ordering).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trade_exceptions') THEN
    CREATE INDEX IF NOT EXISTS "trade_exceptions_workspace_id_idx" ON "trade_exceptions"("workspace_id");
    CREATE INDEX IF NOT EXISTS "trade_exceptions_status_created_at_idx" ON "trade_exceptions"("status", "created_at");
    CREATE INDEX IF NOT EXISTS "trade_exceptions_owner_role_status_idx" ON "trade_exceptions"("owner_role", "status");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchase_orders') THEN
    CREATE INDEX IF NOT EXISTS "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");
    CREATE INDEX IF NOT EXISTS "purchase_orders_status_created_at_idx" ON "purchase_orders"("status", "created_at");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='control_tower_alerts') THEN
    CREATE INDEX IF NOT EXISTS "control_tower_alerts_workspace_id_resolved_at_idx" ON "control_tower_alerts"("workspace_id", "resolved_at");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspace_participants') THEN
    CREATE INDEX IF NOT EXISTS "workspace_participants_user_id_left_at_idx" ON "workspace_participants"("user_id", "left_at");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='freight_selections') THEN
    CREATE INDEX IF NOT EXISTS "freight_selections_shipment_workspace_id_idx" ON "freight_selections"("shipment_workspace_id");
  END IF;
END $$;
