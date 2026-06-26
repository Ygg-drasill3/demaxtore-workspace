-- Sprint 5B — Forwarder directory & freight request communications

CREATE TABLE "forwarder_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forwarder_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "forwarder_contacts_active_idx" ON "forwarder_contacts"("active");
CREATE INDEX "forwarder_contacts_company_name_idx" ON "forwarder_contacts"("company_name");

CREATE TABLE "freight_request_communications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "freight_request_id" UUID NOT NULL,
    "forwarder_contact_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "freight_request_communications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "freight_request_communications_freight_request_id_idx" ON "freight_request_communications"("freight_request_id");
CREATE INDEX "freight_request_communications_status_idx" ON "freight_request_communications"("status");
CREATE INDEX "freight_request_communications_forwarder_contact_id_idx" ON "freight_request_communications"("forwarder_contact_id");

ALTER TABLE "freight_request_communications" ADD CONSTRAINT "freight_request_communications_freight_request_id_fkey"
    FOREIGN KEY ("freight_request_id") REFERENCES "freight_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freight_request_communications" ADD CONSTRAINT "freight_request_communications_forwarder_contact_id_fkey"
    FOREIGN KEY ("forwarder_contact_id") REFERENCES "forwarder_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "freight_offers" ADD COLUMN "forwarder_contact_id" UUID;
ALTER TABLE "freight_offers" ADD COLUMN "offer_source" TEXT;
ALTER TABLE "freight_offers" ADD COLUMN "vessel_name" TEXT;
ALTER TABLE "freight_offers" ADD COLUMN "etd" TIMESTAMP(3);
ALTER TABLE "freight_offers" ADD COLUMN "eta" TIMESTAMP(3);
ALTER TABLE "freight_offers" ADD COLUMN "cut_off" TIMESTAMP(3);
ALTER TABLE "freight_offers" ADD COLUMN "communication_id" UUID;

CREATE INDEX "freight_offers_forwarder_contact_id_idx" ON "freight_offers"("forwarder_contact_id");

ALTER TABLE "freight_offers" ADD CONSTRAINT "freight_offers_forwarder_contact_id_fkey"
    FOREIGN KEY ("forwarder_contact_id") REFERENCES "forwarder_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "freight_offers" ADD CONSTRAINT "freight_offers_communication_id_fkey"
    FOREIGN KEY ("communication_id") REFERENCES "freight_request_communications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
