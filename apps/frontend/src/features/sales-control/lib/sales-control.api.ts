import { api } from "@/lib/api";
import type { CreateCustomerAccountInput, CreateCustomerAccountResponse, CustomerAccountDetailDto, CustomerAccountDto, ResetCustomerPasswordResponse, UpdateCustomerAccountInput } from "@dmx/contracts/sales-control";
import { uploadSalesCustomerFile } from "./sales-control.upload";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { issues?: Array<{ path: (string | number)[]; message: string }> };
  };
  message?: string;
};

const UPLOAD_ERROR_LABELS: Record<string, string> = {
  FILE_REQUIRED: "No file was received. Please try again.",
  EMPTY_FILE: "The file is empty.",
  INVALID_IMAGE_TYPE: "Logo must be PNG, JPG, or WebP.",
  INVALID_CATALOG_TYPE: "Catalog must be a PDF file.",
  UNSUPPORTED_MIME: "This file type is not allowed.",
  FILE_TOO_LARGE: "File is too large.",
  SUPPLIER_NOT_FOUND: "Supplier account not found.",
  ORGANISATION_REQUIRED: "Supplier organisation is missing.",
  UNAUTHENTICATED: "Session expired. Please sign in again.",
};

export function salesControlApiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: ApiErrorBody }; message?: string };
  if (!err.response) {
    return err.message && err.message !== "Network Error" ? err.message : fallback;
  }
  const error = err.response.data?.error;
  const issues = error?.details?.issues;
  if (issues?.length) {
    const first = issues[0];
    const field = first.path?.length ? first.path.join(".") : "field";
    return `${field}: ${first.message}`;
  }
  if (error?.message) return error.message;
  if (error?.code && UPLOAD_ERROR_LABELS[error.code]) return UPLOAD_ERROR_LABELS[error.code];
  return err.response.data?.message ?? fallback;
}

/** @deprecated use salesControlApiErrorMessage */
export function salesControlUploadErrorMessage(e: unknown, fallback: string): string {
  return salesControlApiErrorMessage(e, fallback);
}

export const salesControlApi = {
  listInterestCategories: () =>
    api.get<string[]>("/sales/interest-categories").then((r) => r.data),

  listCustomers: (params?: { q?: string; role?: "BUYER" | "SUPPLIER"; category?: string }) =>
    api
      .get<CustomerAccountDto[]>("/sales/customers", {
        params: {
          ...(params?.q ? { q: params.q } : {}),
          ...(params?.role ? { role: params.role } : {}),
          ...(params?.category ? { category: params.category } : {}),
        },
      })
      .then((r) => r.data),

  getCustomer: (customerId: string) =>
    api.get<CustomerAccountDetailDto>(`/sales/customers/${customerId}`).then((r) => r.data),

  updateCustomer: (customerId: string, payload: UpdateCustomerAccountInput) =>
    api.patch<CustomerAccountDetailDto>(`/sales/customers/${customerId}`, payload).then((r) => r.data),

  createCustomer: (payload: CreateCustomerAccountInput) =>
    api.post<CreateCustomerAccountResponse>("/sales/customers", payload).then((r) => r.data),

  resetCustomerPassword: (customerId: string, newPassword: string) =>
    api
      .post<ResetCustomerPasswordResponse>(`/sales/customers/${customerId}/reset-password`, { newPassword })
      .then((r) => r.data),

  deleteCustomer: (customerId: string) =>
    api.delete<{ email: string; deleted: true }>(`/sales/customers/${customerId}`).then((r) => r.data),

  uploadLogo: (customerId: string, file: File) =>
    uploadSalesCustomerFile<{ logoUrl: string }>(`/sales/customers/${customerId}/logo`, file),

  uploadCatalog: (customerId: string, file: File) =>
    uploadSalesCustomerFile<{ catalogUrl: string; catalogIsExternal?: boolean }>(
      `/sales/customers/${customerId}/catalog`,
      file,
    ),

  setCatalogLink: (customerId: string, url: string) =>
    api
      .put<{ catalogUrl: string | null; catalogIsExternal: boolean }>(
        `/sales/customers/${customerId}/catalog-link`,
        { url },
      )
      .then((r) => r.data),
};
