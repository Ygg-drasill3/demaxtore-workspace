-- Sprint 5A — FreightIQ foundation

CREATE TABLE "freight_requests" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "pol" TEXT NOT NULL,
    "pod" TEXT NOT NULL,
    "cargo_description" TEXT NOT NULL,
    "container_type" TEXT,
    "ready_date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "freight_offers" (
    "id" UUID NOT NULL,
    "freight_request_id" UUID NOT NULL,
    "provider_name" TEXT NOT NULL,
    "carrier_name" TEXT NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "transit_days" INTEGER NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "freight_selections" (
    "id" UUID NOT NULL,
    "freight_request_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "selected_by" UUID NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipment_workspace_id" UUID,

    CONSTRAINT "freight_selections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "freight_selections_freight_request_id_key" ON "freight_selections"("freight_request_id");
CREATE UNIQUE INDEX "freight_selections_offer_id_key" ON "freight_selections"("offer_id");

CREATE INDEX "freight_requests_order_id_idx" ON "freight_requests"("order_id");
CREATE INDEX "freight_requests_status_idx" ON "freight_requests"("status");
CREATE INDEX "freight_requests_buyer_id_idx" ON "freight_requests"("buyer_id");
CREATE INDEX "freight_offers_freight_request_id_idx" ON "freight_offers"("freight_request_id");
CREATE INDEX "freight_offers_status_valid_until_idx" ON "freight_offers"("status", "valid_until");

ALTER TABLE "freight_requests" ADD CONSTRAINT "freight_requests_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "freight_offers" ADD CONSTRAINT "freight_offers_freight_request_id_fkey"
    FOREIGN KEY ("freight_request_id") REFERENCES "freight_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "freight_selections" ADD CONSTRAINT "freight_selections_freight_request_id_fkey"
    FOREIGN KEY ("freight_request_id") REFERENCES "freight_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "freight_selections" ADD CONSTRAINT "freight_selections_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "freight_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "freight_selections" ADD CONSTRAINT "freight_selections_shipment_workspace_id_fkey"
    FOREIGN KEY ("shipment_workspace_id") REFERENCES "shipment_workspaces"("workspace_id") ON DELETE SET NULL ON UPDATE CASCADE;
