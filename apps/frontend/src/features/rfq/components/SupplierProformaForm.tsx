// Supplier-facing inline proforma upload — same placement pattern as SupplierQuoteForm.
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, UploadCloud, Send } from "lucide-react";
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { rfqApi } from "../lib/rfq.api";
import { useSubmitProforma } from "../hooks/useSubmitProforma";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId: string;
  currency?: string;
  lockedAmount?: string | number | null;
}

interface AttachmentRow {
  id: string;
  fileName: string;
  mimeType?: string;
  uploadedAt: string;
}

export function SupplierProformaForm({ workspaceId, currency, lockedAmount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { uploadAndSubmit, submitExisting, isBusy } = useSubmitProforma(workspaceId);

  const attachments = useQuery({
    queryKey: ["rfq", workspaceId, "attachments"],
    queryFn:  () => rfqApi.attach(workspaceId) as Promise<AttachmentRow[]>,
  });

  const pdfFiles = (attachments.data ?? []).filter(
    (a) => a.mimeType === "application/pdf" || /\.pdf$/i.test(a.fileName),
  );
  const latestPdf = pdfFiles[0];

  const pickFile = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    setPendingFile(file);
  };

  const sendPending = () => {
    if (!pendingFile) return;
    uploadAndSubmit.mutate(pendingFile, {
      onSuccess: () => setPendingFile(null),
    });
  };

  const sendLatest = () => {
    if (!latestPdf) return;
    submitExisting.mutate(latestPdf.id);
  };

  return (
    <Card data-testid="supplier-proforma-form" className="border-accent-900/20">
      <CardHeader>
        <div>
          <CardEyebrow>Your action</CardEyebrow>
          <CardTitle className="mt-1">Send proforma invoice</CardTitle>
        </div>
        {lockedAmount != null && currency && (
          <span className="text-xs text-zinc-500 tabular-nums shrink-0">
            Locked · {currency} {typeof lockedAmount === "number" ? lockedAmount.toLocaleString() : lockedAmount}
          </span>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-zinc-600 leading-relaxed">
          Upload your proforma PDF here and send it to the buyer in one step. No need to open More actions.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          data-testid="supplier-proforma-file-input"
          onChange={(e) => pickFile(e.target.files)}
        />

        <div
          data-testid="supplier-proforma-dropzone"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "rounded-xl border-2 border-dashed py-10 px-4 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-accent-900 bg-accent-50"
              : "border-paper-200 hover:border-accent-900/30 hover:bg-paper-50",
          )}
        >
          <UploadCloud className="h-8 w-8 mx-auto text-accent-900 mb-2" />
          {pendingFile ? (
            <>
              <p className="text-sm font-medium text-ink-900">{pendingFile.name}</p>
              <p className="text-xs text-zinc-500 mt-1">Click to choose a different file</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-ink-900">Drop PDF here or click to browse</p>
              <p className="text-xs text-zinc-500 mt-1">Proforma invoice · PDF only · max 25 MB</p>
            </>
          )}
        </div>

        <Button
          data-testid="supplier-proforma-send"
          size="lg"
          className="w-full gap-2"
          disabled={!pendingFile || isBusy}
          loading={uploadAndSubmit.isPending}
          onClick={sendPending}
        >
          <Send className="h-4 w-4" />
          {pendingFile ? `Send ${pendingFile.name} to buyer` : "Choose a PDF first"}
        </Button>

        {latestPdf && !pendingFile && (
          <div className="rounded-lg border border-paper-200 bg-paper-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Latest PDF in this workspace</p>
                <p className="text-sm font-medium text-ink-900 truncate">{latestPdf.fileName}</p>
              </div>
            </div>
            <Button
              data-testid="supplier-proforma-send-existing"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={isBusy}
              loading={submitExisting.isPending}
              onClick={sendLatest}
            >
              Send this file to buyer
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
