-- Trade-scoped chat: RFQ supplier threads + order freight forwarder threads

ALTER TABLE "direct_conversations" DROP CONSTRAINT IF EXISTS "direct_conversations_participant_low_participant_high_key";
ALTER TABLE "direct_conversations" DROP COLUMN IF EXISTS "participant_low";
ALTER TABLE "direct_conversations" DROP COLUMN IF EXISTS "participant_high";

ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "context_type" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "context_workspace_id" UUID;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "context_ref" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "buyer_user_id" UUID;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "peer_user_id" UUID;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "peer_name" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "peer_phone" TEXT;
ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "forwarder_contact_id" UUID;

UPDATE "direct_conversations" SET "context_type" = 'LEGACY' WHERE "context_type" IS NULL;
DELETE FROM "direct_conversations" WHERE "context_type" = 'LEGACY';

ALTER TABLE "direct_conversations" ALTER COLUMN "context_type" SET NOT NULL;
ALTER TABLE "direct_conversations" ALTER COLUMN "context_workspace_id" SET NOT NULL;
ALTER TABLE "direct_conversations" ALTER COLUMN "buyer_user_id" SET NOT NULL;
ALTER TABLE "direct_conversations" ALTER COLUMN "peer_name" SET NOT NULL;

ALTER TABLE "direct_conversations" ADD COLUMN IF NOT EXISTS "peer_key" TEXT;

UPDATE "direct_conversations" SET "peer_key" = COALESCE("peer_user_id"::text, "forwarder_contact_id"::text, 'legacy')
  WHERE "peer_key" IS NULL;

ALTER TABLE "direct_conversations" ALTER COLUMN "peer_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "direct_conversations_trade_peer_key"
  ON "direct_conversations"("context_type", "context_workspace_id", "peer_key");

CREATE INDEX IF NOT EXISTS "direct_conversations_buyer_updated_idx"
  ON "direct_conversations"("buyer_user_id", "updated_at");

CREATE INDEX IF NOT EXISTS "direct_conversations_context_workspace_idx"
  ON "direct_conversations"("context_workspace_id");
