-- Sprint 5D — Purchase Order management

CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "buyer_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "incoterm" TEXT,
    "payment_terms" TEXT,
    "delivery_terms" TEXT,
    "status" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_orders_order_id_key" ON "purchase_orders"("order_id");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_orders_buyer_id_idx" ON "purchase_orders"("buyer_id");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "line_total" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines"("purchase_order_id");

CREATE TABLE "purchase_order_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_order_revisions_purchase_order_id_revision_number_key"
    ON "purchase_order_revisions"("purchase_order_id", "revision_number");

CREATE TABLE "purchase_order_acknowledgements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "supplier_user_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_acknowledgements_purchase_order_id_idx"
    ON "purchase_order_acknowledgements"("purchase_order_id");

CREATE TABLE "purchase_order_amendments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_amendments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_amendments_purchase_order_id_status_idx"
    ON "purchase_order_amendments"("purchase_order_id", "status");

ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_revisions" ADD CONSTRAINT "purchase_order_revisions_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_acknowledgements" ADD CONSTRAINT "purchase_order_acknowledgements_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
