/** Redact signed passwordless tokens from URLs and free text before logging or persistence. */
export function redactPasswordlessTokens(text) {
    if (!text)
        return text;
    return text
        .replace(/([?&]token=)[^&\s"'<>]+/gi, "$1[REDACTED]")
        .replace(/\/access\/conversation\?token=[^&\s"'<>]+/gi, "/access/conversation?token=[REDACTED]");
}
/** Shallow-sanitize provider JSON payloads that may echo request bodies. */
export function sanitizeProviderResponse(raw) {
    if (!raw)
        return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string") {
            out[key] = redactPasswordlessTokens(value);
        }
        else if (value && typeof value === "object" && !Array.isArray(value)) {
            out[key] = sanitizeProviderResponse(value);
        }
        else {
            out[key] = value;
        }
    }
    return out;
}
//# sourceMappingURL=log-redaction.js.map