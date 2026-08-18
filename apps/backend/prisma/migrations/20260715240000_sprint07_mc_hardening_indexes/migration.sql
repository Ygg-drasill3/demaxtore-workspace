-- Sprint 07: indexes for procurement inbox and organization queries
CREATE INDEX IF NOT EXISTS "mixed_container_details_assigned_manager_id_idx"
  ON "mixed_container_details" ("assigned_manager_id");

CREATE INDEX IF NOT EXISTS "mixed_container_details_pricing_requested_at_idx"
  ON "mixed_container_details" ("pricing_requested_at");

CREATE INDEX IF NOT EXISTS "mixed_container_details_organization_status_idx"
  ON "mixed_container_details" ("organization_status");

CREATE INDEX IF NOT EXISTS "mixed_container_details_organization_started_at_idx"
  ON "mixed_container_details" ("organization_started_at");

CREATE INDEX IF NOT EXISTS "mc_organization_events_workspace_module_created_idx"
  ON "mc_organization_events" ("workspace_id", "source_module", "created_at" DESC);
