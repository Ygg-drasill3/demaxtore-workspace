import axios from "axios";
import type {
  ConsumePasswordlessAccessInput,
  ConsumePasswordlessAccessResponse,
  CreatePasswordlessLinkInput,
  CreatePasswordlessLinkResponse,
} from "@dmx/contracts/passwordless-access";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 15_000,
});

export const passwordlessAccessApi = {
  consume: (input: ConsumePasswordlessAccessInput) =>
    http.post<ConsumePasswordlessAccessResponse>("/passwordless-access/consume", input).then((r) => r.data),

  createLink: (input: CreatePasswordlessLinkInput, accessToken: string) =>
    http
      .post<CreatePasswordlessLinkResponse>("/passwordless-access/links", input, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((r) => r.data),
};
