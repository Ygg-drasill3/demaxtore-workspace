export const taskKeys = {
  all: ["tasks"] as const,
  list: (params?: Record<string, unknown>) => [...taskKeys.all, "list", params ?? {}] as const,
  summary: () => [...taskKeys.all, "summary"] as const,
  detail: (id: string) => [...taskKeys.all, id] as const,
  comments: (id: string) => [...taskKeys.all, id, "comments"] as const,
  order: (orderId: string) => [...taskKeys.all, "order", orderId] as const,
  mine: () => [...taskKeys.all, "mine"] as const,
};
