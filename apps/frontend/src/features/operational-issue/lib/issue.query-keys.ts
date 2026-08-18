export const issueKeys = {
  all: ["issues"] as const,
  list: (params?: Record<string, unknown>) => [...issueKeys.all, "list", params ?? {}] as const,
  summary: () => [...issueKeys.all, "summary"] as const,
  detail: (id: string) => [...issueKeys.all, id] as const,
  order: (orderId: string) => [...issueKeys.all, "order", orderId] as const,
};
