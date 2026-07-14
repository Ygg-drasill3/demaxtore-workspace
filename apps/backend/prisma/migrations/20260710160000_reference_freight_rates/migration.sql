-- Monthly reference freight database for Estimated CIF (decision-support layer)

CREATE TABLE "reference_freight_rates" (
    "id" UUID NOT NULL,
    "origin_port" TEXT NOT NULL,
    "destination_port" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "reference_freight" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_freight_rates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reference_freight_rates_origin_port_destination_port_container_type_valid_until_idx"
ON "reference_freight_rates"("origin_port", "destination_port", "container_type", "valid_until");

CREATE INDEX "reference_freight_rates_valid_from_valid_until_idx"
ON "reference_freight_rates"("valid_from", "valid_until");

ALTER TABLE "freight_estimates" ADD COLUMN "reference_freight_rate_id" UUID;

CREATE INDEX "freight_estimates_reference_freight_rate_id_idx"
ON "freight_estimates"("reference_freight_rate_id");

ALTER TABLE "freight_estimates" ADD CONSTRAINT "freight_estimates_reference_freight_rate_id_fkey"
FOREIGN KEY ("reference_freight_rate_id") REFERENCES "reference_freight_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed current-month reference lanes (ops updates monthly via admin API)
INSERT INTO "reference_freight_rates" (
  "id", "origin_port", "destination_port", "container_type",
  "reference_freight", "currency", "valid_from", "valid_until", "created_at", "updated_at"
) VALUES
  (gen_random_uuid(), 'CNSHA', 'NLRTM', '20GP', 2800, 'USD', date_trunc('month', NOW()), (date_trunc('month', NOW()) + interval '1 month' - interval '1 second'), NOW(), NOW()),
  (gen_random_uuid(), 'TRMER', 'NGLOS', '20GP', 2450, 'USD', date_trunc('month', NOW()), (date_trunc('month', NOW()) + interval '1 month' - interval '1 second'), NOW(), NOW()),
  (gen_random_uuid(), 'TRIZM', 'GHTEM', '40HC', 3300, 'USD', date_trunc('month', NOW()), (date_trunc('month', NOW()) + interval '1 month' - interval '1 second'), NOW(), NOW()),
  (gen_random_uuid(), 'TRAMB', 'USNYC', '40HC', 3850, 'USD', date_trunc('month', NOW()), (date_trunc('month', NOW()) + interval '1 month' - interval '1 second'), NOW(), NOW());
