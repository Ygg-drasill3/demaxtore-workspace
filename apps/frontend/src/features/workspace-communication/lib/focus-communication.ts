/** Scroll to a workspace communication panel and focus the composer input. */
export function focusWorkspaceCommunication(testId = "workspace-communication") {
  const root = document.querySelector(`[data-testid="${testId}"]`);
  root?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    const input = document.querySelector('[data-testid="comm-input"]') as HTMLTextAreaElement | null;
    input?.focus();
  }, 350);
}

/** Scroll to trade documents tab and focus the first upload control. */
export function focusTradeDocuments(sectionTestId: string) {
  const root = document.querySelector(`[data-testid="${sectionTestId}"]`);
  root?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    const upload = document.querySelector('[data-testid^="trade-docs-upload-"]') as HTMLButtonElement | null;
    upload?.focus();
  }, 350);
}
