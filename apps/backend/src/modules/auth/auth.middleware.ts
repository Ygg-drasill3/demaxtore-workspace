// apps/backend/src/modules/auth/auth.middleware.ts
// Re-export shim so legacy RFQ module can use the same auth middleware.
export { requireAuth, requireRole } from "../../middleware/auth.js";
