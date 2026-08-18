import type { WhatsAppBusinessConnectionStatus } from "@prisma/client";

export type WhatsAppTenantCredentials = {
  buyerId: string;
  phoneNumberId: string;
  accessToken: string;
  displayPhoneNumber: string;
  wabaId: string;
  metaBusinessId: string;
  verifiedName: string | null;
  connectionId?: string;
};

export type WhatsAppConnectionBuyerDto = {
  status: WhatsAppBusinessConnectionStatus;
  connected: boolean;
  businessName: string | null;
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  connectedAt: string | null;
  healthStatus: "healthy" | "degraded" | "disconnected" | "reauth_required" | "not_connected";
  lastHealthCheckAt: string | null;
  lastErrorMessage: string | null;
};

export type WhatsAppConnectionAdminDto = WhatsAppConnectionBuyerDto & {
  id: string;
  buyerId: string;
  buyerEmail: string | null;
  buyerDisplayName: string | null;
  phoneNumberIdMasked: string | null;
  wabaIdMasked: string | null;
  metaBusinessIdMasked: string | null;
  tokenExpiresAt: string | null;
  disconnectedAt: string | null;
};

/** @deprecated Use WhatsAppConnectionBuyerDto */
export type WhatsAppConnectionPublicDto = {
  id: string;
  buyerId: string;
  metaBusinessId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  status: WhatsAppBusinessConnectionStatus;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmbeddedSignupConfigDto = {
  appId: string;
  configId: string;
  apiVersion: string;
};

export type ConnectWhatsAppBusinessInput = {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  metaBusinessId?: string;
  businessId?: string;
};

export type MetaPhoneNumberRecord = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
};

export type MetaTokenExchangeResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type CompleteEmbeddedSignupInput = {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

export type HealthCheckResult = {
  ok: boolean;
  healthStatus: WhatsAppConnectionBuyerDto["healthStatus"];
  message: string;
  checkedAt: string;
};
