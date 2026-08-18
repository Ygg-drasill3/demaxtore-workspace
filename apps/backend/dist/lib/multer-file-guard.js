import { assertAllowedMime, sanitizeFilename, DEFAULT_ALLOWED_MIMES } from "./upload-security.js";
import { logSecurityEvent } from "./security-audit.js";
export function createUploadFileFilter(allowedMimes = DEFAULT_ALLOWED_MIMES) {
    return (_req, file, cb) => {
        try {
            assertAllowedMime(file.mimetype, allowedMimes);
            sanitizeFilename(file.originalname);
            cb(null, true);
        }
        catch (err) {
            logSecurityEvent("upload.rejected", {
                reason: err instanceof Error ? err.message : "rejected",
                mime: file.mimetype,
                name: file.originalname,
            });
            cb(err instanceof Error ? err : new Error("UPLOAD_REJECTED"));
        }
    };
}
//# sourceMappingURL=multer-file-guard.js.map