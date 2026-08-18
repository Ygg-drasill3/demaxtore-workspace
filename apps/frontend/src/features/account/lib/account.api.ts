import { api } from "@/lib/api";
import type { UpdateProfileInput, UserDTO } from "@dmx/contracts/auth";

export const accountApi = {
  updateProfile: (input: UpdateProfileInput) =>
    api.patch<UserDTO>("/auth/me", input).then((r) => r.data),
  me: () => api.get<UserDTO>("/auth/me").then((r) => r.data),
};
