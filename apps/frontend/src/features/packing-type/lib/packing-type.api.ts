import { api } from "@/lib/api";
import type {
  AdminPackingTypeInput,
  AssignPackingTypeInput,
  PackingTypeDTO,
} from "@dmx/contracts/packing-type";

export const packingTypeAdminApi = {
  list: () =>
    api.get<{ items: PackingTypeDTO[] }>("/admin/packing-types").then((r) => r.data),

  create: (data: AdminPackingTypeInput) =>
    api.post<PackingTypeDTO>("/admin/packing-types", data).then((r) => r.data),

  update: (id: string, data: Partial<AdminPackingTypeInput>) =>
    api.patch<PackingTypeDTO>(`/admin/packing-types/${id}`, data).then((r) => r.data),

  assign: (data: AssignPackingTypeInput) =>
    api.post("/admin/packing-types/assign", data).then((r) => r.data),

  productLinks: (catalogKind: string, productId: string) =>
    api
      .get("/admin/packing-types/product-links", { params: { catalogKind, productId } })
      .then((r) => r.data),
};
