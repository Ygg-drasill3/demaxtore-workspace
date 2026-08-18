export const purchaseOrderRoutes = {
  listBuyer: "/buyer/purchase-orders",
  listSupplier: "/supplier/purchase-orders",
  create: "/buyer/purchase-orders/create",
  detail: (id: string) => `/workspace/po/${id}`,
  orderWorkspace: (orderId: string) => `/workspace/order/${orderId}`,
  rfqWorkspace: (rfqId: string) => `/workspace/rfq/${rfqId}`,
  commodityBidWorkspace: (id: string) => `/workspace/commoditybid/${id}`,
  freightOnOrder: (orderId: string) => `/workspace/order/${orderId}#order-freightiq-section`,
};
