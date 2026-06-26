import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { rfqApi, rfqAttachmentUrl } from "../lib/rfq.api";
import { toast } from "@/store/toast.store";

export function useSubmitProforma(workspaceId: string) {
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/rfq/${workspaceId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { id: string; fileName: string };
    },
  });

  const submit = useMutation({
    mutationFn: (proformaFileUrl: string) =>
      rfqApi.action(workspaceId, "submit_proforma", { payload: { proformaFileUrl } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfq", workspaceId] });
      qc.invalidateQueries({ queryKey: ["rfq", "list"] });
      qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "attachments"] });
      toast.success("Proforma sent", "The buyer can review your invoice now.");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? "Could not submit proforma");
    },
  });

  const uploadAndSubmit = useMutation({
    mutationFn: async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("PDF_REQUIRED");
      }
      const row = await upload.mutateAsync(file);
      const url = rfqAttachmentUrl(workspaceId, row.id);
      await submit.mutateAsync(url);
      return row;
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "PDF_REQUIRED") {
        toast.error("Please choose a PDF file");
        return;
      }
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? "Upload or submit failed");
    },
  });

  const submitExisting = useMutation({
    mutationFn: (attachmentId: string) =>
      submit.mutateAsync(rfqAttachmentUrl(workspaceId, attachmentId)),
  });

  return { upload, submit, uploadAndSubmit, submitExisting, isBusy: upload.isPending || submit.isPending || uploadAndSubmit.isPending };
}
