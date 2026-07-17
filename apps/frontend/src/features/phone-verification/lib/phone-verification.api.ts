import { api } from "@/lib/api";
import type {
  PhoneVerificationMeResponse,
  PhoneVerificationQueueResponse,
  SubmitPhoneInput,
} from "@dmx/contracts/phone-verification";

export const phoneVerificationApi = {
  me: () => api.get<PhoneVerificationMeResponse>("/phone-verification/me").then((r) => r.data),
  submit: (input: SubmitPhoneInput) =>
    api.post("/phone-verification/submit", input).then((r) => r.data),
  queue: (params?: { status?: string; limit?: number; offset?: number }) =>
    api
      .get<PhoneVerificationQueueResponse>("/phone-verification/queue", { params })
      .then((r) => r.data),
  pendingCount: () =>
    api.get<{ count: number }>("/phone-verification/pending-count").then((r) => r.data),
  approve: (id: string, notes?: string) =>
    api.post(`/phone-verification/${id}/approve`, { notes }).then((r) => r.data),
  reject: (id: string, notes?: string) =>
    api.post(`/phone-verification/${id}/reject`, { notes }).then((r) => r.data),
};
