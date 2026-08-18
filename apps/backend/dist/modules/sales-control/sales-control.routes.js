import { Router } from "express";
import multer from "multer";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES } from "../../lib/upload-security.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { salesControlController } from "./sales-control.controller.js";
import { uploadLimiter } from "../../middleware/rate-limit.js";
const salesControlRouter = Router();
const uploadSingle = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
    fileFilter: createUploadFileFilter(),
}).single("file");
salesControlRouter.get("/customers", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.listCustomers));
salesControlRouter.post("/customers", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.createCustomer));
salesControlRouter.get("/interest-categories", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.listInterestCategories));
salesControlRouter.get("/customers/:id", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.getCustomer));
salesControlRouter.patch("/customers/:id", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.updateCustomer));
salesControlRouter.post("/customers/:id/logo", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), uploadLimiter, uploadSingle, asyncHandler(salesControlController.uploadLogo));
salesControlRouter.post("/customers/:id/catalog", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), uploadLimiter, uploadSingle, asyncHandler(salesControlController.uploadCatalog));
salesControlRouter.put("/customers/:id/catalog-link", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.setCatalogLink));
salesControlRouter.post("/customers/:id/reset-password", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.resetCustomerPassword));
salesControlRouter.delete("/customers/:id", requireAuth, requireRole("ADMIN", "SALES_CONTROL"), asyncHandler(salesControlController.deleteCustomer));
export default salesControlRouter;
//# sourceMappingURL=sales-control.routes.js.map