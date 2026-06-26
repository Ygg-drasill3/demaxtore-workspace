import { api } from "@/lib/api";
import type { CreateCustomerAccountInput, CreateCustomerAccountResponse, CustomerAccountDto, ResetCustomerPasswordResponse } from "@dmx/contracts/sales-control";

export const salesControlApi = {
  listCustomers: (q?: string) =>
    api.get<CustomerAccountDto[]>("/sales/customers", { params: q ? { q } : undefined }).then((r) => r.data),

  createCustomer: (payload: CreateCustomerAccountInput) =>
    api.post<CreateCustomerAccountResponse>("/sales/customers", payload).then((r) => r.data),

  resetCustomerPassword: (customerId: string, newPassword: string) =>
    api
      .post<ResetCustomerPasswordResponse>(`/sales/customers/${customerId}/reset-password`, { newPassword })
      .then((r) => r.data),

  deleteCustomer: (customerId: string) =>
    api.delete<{ email: string; deleted: true }>(`/sales/customers/${customerId}`).then((r) => r.data),
};
