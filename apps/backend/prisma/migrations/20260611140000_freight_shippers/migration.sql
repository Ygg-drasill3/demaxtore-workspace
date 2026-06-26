-- FreightIQ shipper (carrier / shipping line) directory
CREATE TABLE "freight_shippers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "scac_code" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freight_shippers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "freight_shippers_name_key" ON "freight_shippers"("name");
CREATE INDEX "freight_shippers_active_idx" ON "freight_shippers"("active");
