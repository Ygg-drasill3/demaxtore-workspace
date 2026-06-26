-- Sprint 17B — FreightIQ Booking Engine

CREATE TABLE "cargo_ready_forecasts" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "freight_booking_id" UUID,
    "production_start_date" TIMESTAMP(3) NOT NULL,
    "estimated_production_finish_date" TIMESTAMP(3) NOT NULL,
    "estimated_cargo_ready_date" TIMESTAMP(3) NOT NULL,
    "confidence_level" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_ready_forecasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "freight_bookings" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "selected_carrier_option_id" UUID,
    "approved_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carrier_options" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "freight_booking_id" UUID NOT NULL,
    "carrier_name" TEXT NOT NULL,
    "vessel_name" TEXT NOT NULL,
    "origin_port" TEXT NOT NULL,
    "destination_port" TEXT NOT NULL,
    "etd" TIMESTAMP(3) NOT NULL,
    "eta" TIMESTAMP(3) NOT NULL,
    "transit_days" INTEGER NOT NULL,
    "cutoff_date" TIMESTAMP(3) NOT NULL,
    "freight_amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "recommendation_score" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cargo_ready_forecasts_trade_id_status_idx" ON "cargo_ready_forecasts"("trade_id", "status");
CREATE INDEX "cargo_ready_forecasts_freight_booking_id_idx" ON "cargo_ready_forecasts"("freight_booking_id");

CREATE INDEX "freight_bookings_trade_id_status_idx" ON "freight_bookings"("trade_id", "status");
CREATE INDEX "freight_bookings_status_updated_at_idx" ON "freight_bookings"("status", "updated_at");

CREATE UNIQUE INDEX "freight_bookings_selected_carrier_option_id_key" ON "freight_bookings"("selected_carrier_option_id");

CREATE INDEX "carrier_options_freight_booking_id_status_idx" ON "carrier_options"("freight_booking_id", "status");
CREATE INDEX "carrier_options_trade_id_idx" ON "carrier_options"("trade_id");

ALTER TABLE "cargo_ready_forecasts" ADD CONSTRAINT "cargo_ready_forecasts_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cargo_ready_forecasts" ADD CONSTRAINT "cargo_ready_forecasts_freight_booking_id_fkey" FOREIGN KEY ("freight_booking_id") REFERENCES "freight_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_selected_carrier_option_id_fkey" FOREIGN KEY ("selected_carrier_option_id") REFERENCES "carrier_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carrier_options" ADD CONSTRAINT "carrier_options_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carrier_options" ADD CONSTRAINT "carrier_options_freight_booking_id_fkey" FOREIGN KEY ("freight_booking_id") REFERENCES "freight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
