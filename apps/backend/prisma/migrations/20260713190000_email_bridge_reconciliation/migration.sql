-- Email Bridge reconciliation: delivery-bound passwordless tokens
ALTER TABLE "passwordless_access_tokens" ADD COLUMN "email_delivery_id" UUID;
ALTER TABLE "passwordless_access_tokens" ADD COLUMN "revoked_at" TIMESTAMP(3);

CREATE INDEX "passwordless_access_tokens_email_delivery_id_idx"
  ON "passwordless_access_tokens"("email_delivery_id");

ALTER TABLE "email_notification_deliveries" ADD COLUMN "passwordless_token_id" UUID;

CREATE INDEX "email_notification_deliveries_passwordless_token_id_idx"
  ON "email_notification_deliveries"("passwordless_token_id");
