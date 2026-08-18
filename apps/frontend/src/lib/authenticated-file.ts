import { api } from "./api";

function toApiRelativePath(url: string): string {
  const base = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
  if (url.startsWith(`${base}/`) || url === base) {
    const rel = url.slice(base.length);
    return rel.startsWith("/") ? rel : `/${rel}`;
  }
  if (url.startsWith("/api/")) return url.slice(4);
  if (url.startsWith("/")) return url;
  try {
    const path = new URL(url).pathname;
    return path.startsWith("/api/") ? path.slice(4) : path;
  } catch {
    return url;
  }
}

export async function fetchAuthenticatedBlob(url: string, opts?: { signal?: AbortSignal }): Promise<Blob> {
  const path = toApiRelativePath(url);
  const { data } = await api.get<Blob>(path, { responseType: "blob", signal: opts?.signal });
  return data;
}

export async function openAuthenticatedDocument(url: string): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("POPUP_BLOCKED");
  try {
    popup.opener = null;
    const blob = await fetchAuthenticatedBlob(url);
    const blobUrl = URL.createObjectURL(blob);
    popup.location.replace(blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  } catch (err) {
    popup.close();
    throw err;
  }
}

export async function downloadAuthenticatedDocument(url: string, fileName: string): Promise<void> {
  const blob = await fetchAuthenticatedBlob(url);
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}
