/** Sprint 6B — route / lane resolution from POL/POD codes */
const PORT_COUNTRY = {
    TRIST: "Turkey",
    MERSIN: "Turkey",
    IST: "Turkey",
    TRMER: "Turkey",
    TRIZM: "Turkey",
    TRAMB: "Turkey",
    GHTEM: "Ghana",
    CNSHA: "China",
    AEJEA: "UAE",
    JEA: "UAE",
    AEADH: "UAE",
    SADMM: "Saudi Arabia",
    SAJED: "Saudi Arabia",
    NGLOS: "Nigeria",
    NGAPP: "Nigeria",
    GBFXT: "UK",
    GBLGP: "UK",
    NLRTM: "Netherlands",
    USLAX: "USA",
    USNYC: "USA",
    USHOU: "USA",
    USMIA: "USA",
};
function normalizePort(code) {
    return code.trim().toUpperCase().replace(/\s+/g, "");
}
function countryForPort(code) {
    const key = normalizePort(code);
    if (PORT_COUNTRY[key])
        return PORT_COUNTRY[key];
    if (key.length >= 2) {
        const prefix = key.slice(0, 2);
        const byPrefix = {
            TR: "Turkey",
            AE: "UAE",
            SA: "Saudi Arabia",
            NG: "Nigeria",
            GB: "UK",
            US: "USA",
            NL: "Netherlands",
            DE: "Germany",
            FR: "France",
            IT: "Italy",
            ES: "Spain",
            CN: "China",
            IN: "India",
        };
        if (byPrefix[prefix])
            return byPrefix[prefix];
    }
    return key || "Unknown";
}
export function resolveFreightRoute(pol, pod) {
    const polNorm = normalizePort(pol);
    const podNorm = normalizePort(pod);
    const countryFrom = countryForPort(polNorm);
    const countryTo = countryForPort(podNorm);
    const lane = `${countryFrom} → ${countryTo}`;
    const route = `${polNorm}→${podNorm}`;
    return { pol: polNorm, pod: podNorm, countryFrom, countryTo, lane, route };
}
//# sourceMappingURL=freight-route.util.js.map