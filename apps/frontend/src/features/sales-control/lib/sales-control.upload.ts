import { ensureAccessToken, unauthenticatedApiError } from "@/lib/ensure-access-token";
import { useAuth } from "@/store/auth.store";

type UploadErrorBody = {
  error?: { code?: string; message?: string };
  message?: string;
};

function apiBase(): string {
  return (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
}

async function postMultipart(path: string, file: File, token: string): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 120_000);

  try {
    return await fetch(`${apiBase()}${path}`, {
      method: "POST",
      credentials: "include",
      body: fd,
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": crypto.randomUUID(),
      },
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw {
        response: {
          status: 408,
          data: { error: { code: "UPLOAD_TIMEOUT", message: "Upload timed out" } },
        },
      };
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseUploadResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as UploadErrorBody;
  } catch {
    if (res.status === 413) {
      throw {
        response: {
          status: 413,
          data: { error: { code: "FILE_TOO_LARGE", message: "File exceeds server upload limit (30 MB)." } },
        },
      };
    }
    throw {
      response: {
        status: res.status,
        data: { error: { message: text.slice(0, 200) || `Upload failed (${res.status})` } },
      },
    };
  }
}

/** Native fetch upload — avoids axios multipart Content-Type issues in the browser. */
export async function uploadSalesCustomerFile<T>(path: string, file: File): Promise<T> {
  let token = await ensureAccessToken();
  let res = await postMultipart(path, file, token);

  if (res.status === 401) {
    try {
      await useAuth.getState().refresh();
      token = useAuth.getState().accessToken ?? "";
      if (!token) throw unauthenticatedApiError();
      res = await postMultipart(path, file, token);
    } catch (e) {
      if ((e as { response?: unknown }).response) throw e;
      throw unauthenticatedApiError();
    }
  }

  const data = await parseUploadResponse(res);
  if (!res.ok) {
    throw { response: { status: res.status, data } };
  }

  return data as T;
}
