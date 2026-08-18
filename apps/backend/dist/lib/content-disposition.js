/** Safe Content-Disposition for file downloads (RFC 5987 + ASCII fallback). */
import path from "node:path";
export function buildContentDisposition(fileName, inline = false) {
    const base = path.basename(fileName);
    const sanitized = base
        .replace(/[\r\n\0]/g, "")
        .replace(/["\\/]/g, "_")
        .trim()
        .slice(0, 200) || "download";
    const ascii = sanitized.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "'");
    const disposition = inline ? "inline" : "attachment";
    const encoded = encodeURIComponent(sanitized).replace(/['()]/g, escape);
    return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
export function isInlinePreviewable(mimeType) {
    return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}
//# sourceMappingURL=content-disposition.js.map