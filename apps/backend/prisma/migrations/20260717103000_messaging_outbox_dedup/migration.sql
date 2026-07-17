-- Unified Messaging transactional outbox + persistent idempotency keys
CREATE TABLE "messaging_outbox_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "conversation_id" UUID,
    "message_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messaging_outbox_events_idempotency_key_key" ON "messaging_outbox_events"("idempotency_key");
CREATE INDEX "messaging_outbox_events_status_available_at_idx" ON "messaging_outbox_events"("status", "available_at");
CREATE INDEX "messaging_outbox_events_conversation_id_idx" ON "messaging_outbox_events"("conversation_id");

CREATE TABLE "messaging_idempotency_keys" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messaging_idempotency_keys_key_hash_key" ON "messaging_idempotency_keys"("key_hash");
CREATE INDEX "messaging_idempotency_keys_expires_at_idx" ON "messaging_idempotency_keys"("expires_at");
