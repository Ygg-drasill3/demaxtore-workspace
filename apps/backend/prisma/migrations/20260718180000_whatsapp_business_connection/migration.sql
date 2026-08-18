-- CreateEnum
CREATE TYPE "WhatsAppBusinessConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRED', 'REVOKED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "whatsapp_business_connections" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "meta_business_id" TEXT NOT NULL,
    "waba_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "display_phone_number" TEXT NOT NULL,
    "verified_name" TEXT,
    "encrypted_access_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "status" "WhatsAppBusinessConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_business_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_business_connections_buyer_id_key" ON "whatsapp_business_connections"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_business_connections_phone_number_id_key" ON "whatsapp_business_connections"("phone_number_id");

-- CreateIndex
CREATE INDEX "whatsapp_business_connections_status_idx" ON "whatsapp_business_connections"("status");

-- CreateIndex
CREATE INDEX "whatsapp_business_connections_waba_id_idx" ON "whatsapp_business_connections"("waba_id");

-- AddForeignKey
ALTER TABLE "whatsapp_business_connections" ADD CONSTRAINT "whatsapp_business_connections_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
