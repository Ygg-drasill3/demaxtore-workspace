-- Reference freight admin: status, audit trail, overlap prevention

ALTER TABLE "reference_freight_rates" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "reference_freight_rates_status_idx" ON "reference_freight_rates"("status");

CREATE TABLE "reference_freight_rate_audits" (
    "id" UUID NOT NULL,
    "rate_id" UUID,
    "action" TEXT NOT NULL,
    "actor_user_id" UUID,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_freight_rate_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reference_freight_rate_audits_rate_id_created_at_idx"
ON "reference_freight_rate_audits"("rate_id", "created_at");

CREATE INDEX "reference_freight_rate_audits_created_at_idx"
ON "reference_freight_rate_audits"("created_at");

ALTER TABLE "reference_freight_rate_audits" ADD CONSTRAINT "reference_freight_rate_audits_rate_id_fkey"
FOREIGN KEY ("rate_id") REFERENCES "reference_freight_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prevent overlapping ACTIVE validity windows for the same lane
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reference_freight_rates" ADD CONSTRAINT "reference_freight_rates_no_overlap"
EXCLUDE USING gist (
  "origin_port" WITH =,
  "destination_port" WITH =,
  "container_type" WITH =,
  tsrange("valid_from", "valid_until", '[]') WITH &&
) WHERE ("status" = 'ACTIVE');
