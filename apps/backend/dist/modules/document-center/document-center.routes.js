import { Router } from "express";
import multer from "multer";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES } from "../../lib/upload-security.js";
import { requireAuth } from "../../middleware/auth.js";
import { documentCenterController } from "./document-center.controller.js";
import { uploadLimiter } from "../../middleware/rate-limit.js";
const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
    fileFilter: createUploadFileFilter(),
});
const uploadSingle = upload.single("file");
router.get("/", requireAuth, documentCenterController.list);
router.post("/upload", requireAuth, uploadLimiter, uploadSingle, documentCenterController.upload);
router.get("/:id/download", requireAuth, documentCenterController.download);
router.post("/:id/approve", requireAuth, documentCenterController.approve);
router.post("/:id/reject", requireAuth, documentCenterController.reject);
router.post("/:id/request-revision", requireAuth, documentCenterController.requestRevision);
router.get("/:id", requireAuth, documentCenterController.detail);
export default router;
//# sourceMappingURL=document-center.routes.js.map