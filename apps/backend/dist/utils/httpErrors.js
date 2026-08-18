// apps/backend/src/utils/httpErrors.ts
// AppError — used by legacy RFQ module. Subclass of HttpError so the global
// error handler can serialise it through the @dmx/contracts ApiError envelope.
// Signature: `new AppError(status, code, details?)` — message is derived from
// the code (humanise underscores) when not provided.
import { HttpError } from "../lib/errors.js";
const humanise = (code) => code.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export class AppError extends HttpError {
    constructor(status, code, details) {
        const message = typeof details?.message === "string" ? details.message : humanise(code);
        super(status, code, message, details);
    }
}
//# sourceMappingURL=httpErrors.js.map