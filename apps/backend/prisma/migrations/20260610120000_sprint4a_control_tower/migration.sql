-- Sprint 4A — Control Tower alerts (read-only operations intelligence)

CREATE TABLE "control_tower_alerts" (
    "id" UUID NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "alert_key" TEXT NOT NULL,
    "workspace_id" UUID,
    "workspace_type" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_tower_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "control_tower_alerts_severity_resolved_at_idx"
    ON "control_tower_alerts"("severity", "resolved_at");

CREATE INDEX "control_tower_alerts_category_resolved_at_idx"
    ON "control_tower_alerts"("category", "resolved_at");

CREATE INDEX "control_tower_alerts_workspace_id_alert_key_idx"
    ON "control_tower_alerts"("workspace_id", "alert_key");

CREATE UNIQUE INDEX "control_tower_alerts_open_dedup_idx"
    ON "control_tower_alerts"("workspace_id", "alert_key")
    WHERE "resolved_at" IS NULL AND "workspace_id" IS NOT NULL;

ALTER TABLE "control_tower_alerts"
    ADD CONSTRAINT "control_tower_alerts_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
