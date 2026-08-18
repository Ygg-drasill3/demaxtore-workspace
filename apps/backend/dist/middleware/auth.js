import { verifyAccessToken } from "../modules/auth/jwt.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";
import { isPasswordlessAllowedPath } from "../modules/passwordless-access/passwordless-access.policy.js";
function extractBearer(req) {
    const header = req.headers.authorization;
    if (!header)
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token)
        return null;
    return token.trim();
}
export const requireAuth = (req, _res, next) => {
    const token = extractBearer(req);
    if (!token)
        return next(Unauthorized("Missing bearer token"));
    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        req.accessMode = payload.accessMode ?? "full";
        req.passwordlessScope = payload.pwa;
        if (req.accessMode === "passwordless" && !isPasswordlessAllowedPath(req)) {
            return next(Forbidden("Passwordless access is limited to workspace conversation"));
        }
        next();
    }
    catch {
        next(Unauthorized("Invalid or expired access token"));
    }
};
export const requireFullAccess = (req, _res, next) => {
    if (req.accessMode === "passwordless") {
        return next(Forbidden("Full workspace authentication required"));
    }
    next();
};
export const requireRole = (...allowed) => (req, _res, next) => {
    if (!req.user)
        return next(Unauthorized());
    if (!allowed.includes(req.user.role))
        return next(Forbidden(`Requires role: ${allowed.join("|")}`));
    next();
};
//# sourceMappingURL=auth.js.map