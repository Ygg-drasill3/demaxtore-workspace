import { api } from "@/lib/api";
import type {
  ShipmentBookingDto,
  ShipmentContainerDto,
  ShipmentPermissions,
  ShipmentSummaryDto,
  ShipmentTransportMode,
} from "@dmx/contracts/shipment-workspace";
import type {
  ShipmentMilestoneDto,
  ShipmentMilestoneSummaryDto,
} from "@dmx/contracts/shipment-milestones";
import type {
  CompleteShipmentMilestoneInput,
  CreateShipmentContainerInput,
  CreateShipmentMilestoneInput,
  PatchShipmentContainerInput,
  PatchShipmentMilestoneInput,
  PatchShipmentWorkspaceInput,
  UpsertShipmentBookingInput,
} from "@dmx/contracts/shipment-workspace.zod";

const base = (id: string) => `/shipments/${id}`;

export type ShipmentWorkspaceDto = {
  id: string;
  externalRef: string;
  state: string;
  currency: string;
  spawnedFromId?: string | null;
  spawnedFrom?: { id: string; externalRef: string; type: string } | null;
  orderRef: string;
  poRef?: string | null;
  purchaseOrderId?: string | null;
  contractRef: string;
  originPort: string;
  destinationPort: string;
  containerNumber?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  bookingRef?: string | null;
  carrierName?: string | null;
  transportMode?: ShipmentTransportMode;
  forwarderName?: string | null;
  airlineName?: string | null;
  flightNumber?: string | null;
  truckReference?: string | null;
  trainReference?: string | null;
  etd?: string | null;
  eta?: string | null;
  currentEta?: string | null;
  incoterm?: string | null;
  bookingDate?: string | null;
  bookingConfirmedAt?: string | null;
  departedAt?: string | null;
  arrivedAt?: string | null;
  deliveredAt?: string | null;
  totalGrossWeightKg?: number | null;
  totalVolumeCbm?: number | null;
  ownerUserId?: string;
  supplierUserId?: string;
  hasOpenException?: boolean;
  summary?: ShipmentSummaryDto;
  booking?: ShipmentBookingDto;
  containers?: ShipmentContainerDto[];
  milestones?: ShipmentMilestoneDto[];
  milestoneSummary?: ShipmentMilestoneSummaryDto;
  permissions?: ShipmentPermissions;
  participants?: Array<{
    userId: string;
    participantRole: string;
    displayName: string;
    email: string;
  }>;
  exceptions?: Array<{
    id: string;
    category: string;
    reason: string;
    status: string;
    stateBefore: string;
    reportedAt: string;
    resolvedAt: string | null;
  }>;
};

export const shipmentApi = {
  get: (id: string) => api.get<ShipmentWorkspaceDto>(base(id)).then((r) => r.data),
  patch: (id: string, body: PatchShipmentWorkspaceInput) =>
    api.patch<ShipmentWorkspaceDto>(base(id), body).then((r) => r.data),
  upsertBooking: (id: string, body: UpsertShipmentBookingInput) =>
    api.post<ShipmentWorkspaceDto>(`${base(id)}/booking`, body).then((r) => r.data),
  cancelBooking: (id: string, body?: { reason?: string }) =>
    api.post<ShipmentWorkspaceDto>(`${base(id)}/booking/cancel`, body ?? {}).then((r) => r.data),
  transitionBooking: (id: string, body: { toStatus: string; reason?: string }) =>
    api
      .post<ShipmentWorkspaceDto>(`${base(id)}/booking/transition`, body)
      .then((r) => r.data),
  listContainers: (id: string) =>
    api.get<{ items: ShipmentContainerDto[] }>(`${base(id)}/containers`).then((r) => r.data.items),
  addContainer: (id: string, body: CreateShipmentContainerInput) =>
    api.post<ShipmentContainerDto>(`${base(id)}/containers`, body).then((r) => r.data),
  patchContainer: (id: string, containerId: string, body: PatchShipmentContainerInput) =>
    api.patch<ShipmentContainerDto>(`${base(id)}/containers/${containerId}`, body).then((r) => r.data),
  removeContainer: (id: string, containerId: string) =>
    api.delete(`${base(id)}/containers/${containerId}`).then(() => undefined),
  listMilestones: (id: string) =>
    api.get(`${base(id)}/milestones`).then((r) => r.data as {
      items: ShipmentMilestoneDto[];
      summary: ShipmentMilestoneSummaryDto;
    }),
  createMilestone: (id: string, body: CreateShipmentMilestoneInput) =>
    api.post<ShipmentMilestoneDto>(`${base(id)}/milestones`, body).then((r) => r.data),
  patchMilestone: (id: string, milestoneId: string, body: PatchShipmentMilestoneInput) =>
    api
      .patch<ShipmentMilestoneDto>(`${base(id)}/milestones/${milestoneId}`, body)
      .then((r) => r.data),
  completeMilestone: (id: string, milestoneId: string, body?: CompleteShipmentMilestoneInput) =>
    api
      .post(`${base(id)}/milestones/${milestoneId}/complete`, body ?? {})
      .then((r) => r.data as { items: ShipmentMilestoneDto[]; summary: ShipmentMilestoneSummaryDto }),
  delayedShipments: (params?: Record<string, unknown>) =>
    api.get("/shipments/delayed", { params }).then((r) => r.data),
  upcomingMilestones: (params?: Record<string, unknown>) =>
    api.get("/shipments/upcoming", { params }).then((r) => r.data),
  milestoneSummary: () =>
    api.get("/shipments/milestones/summary").then((r) => r.data as {
      upcoming: number;
      delayed: number;
      departuresToday: number;
      deliveriesToday: number;
      highRisk: number;
    }),
  patchStatus: (id: string, status: "booked" | "in_transit" | "delivered", reason?: string) =>
    api.patch(`${base(id)}/status`, { status, reason }).then((r) => r.data),
  timeline: (id: string) => api.get(`${base(id)}/timeline`).then((r) => r.data),
  nextActions: (id: string) => api.get(`${base(id)}/next-actions`).then((r) => r.data),
  documents: (id: string) => api.get(`${base(id)}/documents`).then((r) => r.data),
  exceptions: (id: string) => api.get(`${base(id)}/exceptions`).then((r) => r.data),
  action: (id: string, path: string, body: unknown = {}) =>
    api.post(`${base(id)}/actions/${path}`, body).then((r) => r.data),
  trackingConfig: () =>
    api.get("/shipments/tracking/config").then((r) => r.data as {
      provider: string;
      liveApi: boolean;
      label: string;
    }),
  tracking: (id: string) => api.get(`${base(id)}/tracking`).then((r) => r.data),
  linkTracking: (id: string, body: { containerNumber?: string; bookingNumber?: string; vesselReference?: string }) =>
    api.post(`${base(id)}/link-tracking`, body).then((r) => r.data),
  syncTracking: (id: string) => api.post(`${base(id)}/sync-tracking`, {}).then((r) => r.data),
};
