import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentDownloadButton from "./AttachmentDownloadButton";

vi.mock("@/lib/authenticated-file", () => ({
  downloadAuthenticatedDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/store/toast.store", () => ({
  toast: { error: vi.fn() },
}));

describe("AttachmentDownloadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders download button with filename", () => {
    render(
      <AttachmentDownloadButton
        workspaceType="ORDER"
        workspaceId="ws-1"
        attachmentId="att-1"
        fileName="comm.pdf"
        fileSizeBytes={1024}
        downloadUrl="/api/workspaces/order/ws-1/conversation/attachments/att-1/download"
      />,
    );
    expect(screen.getByTestId("hub-attachment-download-att-1")).toBeTruthy();
    expect(screen.getByText("comm.pdf")).toBeTruthy();
    expect(screen.getByText("1.0 KB")).toBeTruthy();
  });

  it("triggers authenticated download on click", async () => {
    const { downloadAuthenticatedDocument } = await import("@/lib/authenticated-file");
    render(
      <AttachmentDownloadButton
        workspaceType="ORDER"
        workspaceId="ws-1"
        attachmentId="att-1"
        fileName="comm.pdf"
        downloadUrl="/api/test/download"
      />,
    );
    fireEvent.click(screen.getByTestId("hub-attachment-download-att-1"));
    await waitFor(() => {
      expect(downloadAuthenticatedDocument).toHaveBeenCalledWith("/api/test/download", "comm.pdf");
    });
  });
});
