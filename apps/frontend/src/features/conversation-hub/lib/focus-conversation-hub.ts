export function focusConversationHub(testId = "conversation-hub") {
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }
}
