const SCANNER_UA_PATTERNS = [
    /proofpoint/i,
    /urldefense/i,
    /safelinks/i,
    /mimecast/i,
    /barracuda/i,
    /fireeye/i,
    /google[-_]?image[-_]?proxy/i,
    /yahoo!.?slurp/i,
    /linkedinbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /slackbot/i,
    /discordbot/i,
    /headlesschrome/i,
    /phantomjs/i,
];
/** Cautious heuristic — never used as the sole gate for token consumption. */
export function detectLinkScannerUserAgent(userAgent) {
    if (!userAgent?.trim())
        return false;
    return SCANNER_UA_PATTERNS.some((re) => re.test(userAgent));
}
//# sourceMappingURL=passwordless-access.scanners.js.map