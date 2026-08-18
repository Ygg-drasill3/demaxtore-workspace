// Request ID + correlation ID propagation for observability.
import { randomUUID } from "node:crypto";
export function requestContext(req, res, next) {
    const incoming = req.headers["x-request-id"];
    const correlation = req.headers["x-correlation-id"];
    req.requestId = typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();
    req.correlationId =
        typeof correlation === "string" && correlation.trim() ? correlation.trim() : req.requestId;
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Correlation-Id", req.correlationId);
    next();
}
//# sourceMappingURL=request-context.js.map