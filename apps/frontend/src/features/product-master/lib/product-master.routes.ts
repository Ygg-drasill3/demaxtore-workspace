export const PRODUCT_MASTER_ROUTES = {
  list: "/buyer/products",
  create: "/buyer/products/new",
  detail: (id: string) => `/buyer/products/${id}`,
} as const;
