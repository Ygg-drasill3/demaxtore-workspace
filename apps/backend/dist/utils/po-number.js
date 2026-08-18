import { randomBytes } from "node:crypto";
/** Generates a unique-style PO number on each issue (not user-supplied). */
export function generatePoNumber() {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(4).toString("hex").toUpperCase();
    return `PO-${stamp}-${rand}`;
}
//# sourceMappingURL=po-number.js.map