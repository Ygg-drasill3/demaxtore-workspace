-- Sprint 4B — Port-to-port maritime tracking

ALTER TABLE "shipment_workspaces"
    ADD COLUMN "reference_number" TEXT,
    ADD COLUMN "booking_number" TEXT,
    ADD COLUMN "tracking_linked_at" TIMESTAMP(3),
    ADD COLUMN "last_tracking_sync_at" TIMESTAMP(3),
    ADD COLUMN "last_tracking_sync_error" TEXT;

CREATE INDEX "shipment_workspaces_tracking_linked_at_idx"
    ON "shipment_workspaces"("tracking_linked_at");

CREATE TABLE "shipment_tracking_snapshots" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "vessel_name" TEXT,
    "imo" TEXT,
    "mmsi" TEXT,
    "carrier" TEXT,
    "voyage" TEXT,
    "pol" TEXT,
    "pod" TEXT,
    "etd" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "last_position_at" TIMESTAMP(3),
    "tracking_status" TEXT NOT NULL,
    "delay_flag" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipment_tracking_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipment_tracking_snapshots_shipment_id_synced_at_idx"
    ON "shipment_tracking_snapshots"("shipment_id", "synced_at");

CREATE INDEX "shipment_tracking_events_shipment_id_occurred_at_idx"
    ON "shipment_tracking_events"("shipment_id", "occurred_at");

ALTER TABLE "shipment_tracking_snapshots"
    ADD CONSTRAINT "shipment_tracking_snapshots_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipment_tracking_events"
    ADD CONSTRAINT "shipment_tracking_events_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
