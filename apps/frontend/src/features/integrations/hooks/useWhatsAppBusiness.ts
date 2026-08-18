import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/store/toast.store";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  isEmbeddedSignupConfigured,
  launchEmbeddedSignup,
  listenEmbeddedSignupSession,
  loadFacebookSdk,
  whatsappBusinessApi,
} from "../lib/whatsapp-business.api";

const QUERY_KEY = ["whatsapp-business-connection"];

export function useWhatsAppBusinessConnection() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: whatsappBusinessApi.getConnection,
  });
}

export function useConnectWhatsAppBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isEmbeddedSignupConfigured()) {
        throw new Error("Meta Embedded Signup is not configured in this environment.");
      }
      await loadFacebookSdk();
      const sessionPromise = listenEmbeddedSignupSession();
      const signup = await launchEmbeddedSignup();
      const session = await sessionPromise;
      return whatsappBusinessApi.completeEmbeddedSignup({
        code: signup.code,
        wabaId: session.wabaId ?? signup.wabaId,
        phoneNumberId: session.phoneNumberId ?? signup.phoneNumberId,
        businessId: session.businessId ?? signup.businessId,
      });
    },
    onSuccess: (connection) => {
      queryClient.setQueryData(QUERY_KEY, connection);
      toast.success(
        "WhatsApp Business connected",
        `${connection.displayPhoneNumber ?? connection.businessName ?? "Your number"} is now linked.`,
      );
    },
    onError: (err) => {
      toast.error("Connection failed", getApiErrorMessage(err, "Could not connect WhatsApp Business."));
    },
  });
}

export function useReconnectWhatsAppBusiness() {
  const connect = useConnectWhatsAppBusiness();
  return useMutation({
    mutationFn: async () => {
      await whatsappBusinessApi.prepareReconnect();
      return connect.mutateAsync();
    },
  });
}

export function useTestWhatsAppBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: whatsappBusinessApi.testConnection,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (result.ok) {
        toast.success("Connection healthy", result.message);
      } else {
        toast.error("Connection issue", result.message);
      }
    },
    onError: (err) => {
      toast.error("Health check failed", getApiErrorMessage(err, "Could not verify connection."));
    },
  });
}

export function useDisconnectWhatsAppBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: whatsappBusinessApi.disconnect,
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEY, {
        status: "DISCONNECTED",
        connected: false,
        businessName: null,
        verifiedName: null,
        displayPhoneNumber: null,
        connectedAt: null,
        healthStatus: "disconnected",
        lastHealthCheckAt: null,
        lastErrorMessage: null,
      });
      toast.success("Disconnected", "Your WhatsApp Business account has been disconnected.");
    },
    onError: (err) => {
      toast.error("Disconnect failed", getApiErrorMessage(err, "Could not disconnect WhatsApp Business."));
    },
  });
}

export { isEmbeddedSignupConfigured };
