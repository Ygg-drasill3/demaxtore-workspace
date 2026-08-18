/** Port code / name normalization for reference freight lookup */
const PORT_ALIASES = {
    MERSIN: "TRMER",
    TRMERSIN: "TRMER",
    IZMIR: "TRIZM",
    TRIZMIR: "TRIZM",
    ISTANBUL: "TRIST",
    AMBARLI: "TRAMB",
    TRAMBARLI: "TRAMB",
    LAGOS: "NGLOS",
    TEMA: "GHTEM",
    NEWYORK: "USNYC",
    "NEW YORK": "USNYC",
    ROTTERDAM: "NLRTM",
    SHANGHAI: "CNSHA",
    CN: "CNSHA",
};
const TARGET_MARKET_POD = {
    EU: "NLRTM",
    EUROPE: "NLRTM",
    USA: "USNYC",
    US: "USNYC",
    UK: "GBFXT",
    UAE: "AEJEA",
    NIGERIA: "NGLOS",
    GHANA: "GHTEM",
    NETHERLANDS: "NLRTM",
    CHINA: "CNSHA",
};
export function normalizePortCode(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return "";
    const upper = trimmed.toUpperCase().replace(/\s+/g, "");
    if (PORT_ALIASES[upper])
        return PORT_ALIASES[upper];
    if (PORT_ALIASES[trimmed.toUpperCase()])
        return PORT_ALIASES[trimmed.toUpperCase()];
    if (TARGET_MARKET_POD[upper])
        return TARGET_MARKET_POD[upper];
    return upper;
}
export function normalizeContainerType(input) {
    const upper = input.trim().toUpperCase().replace(/\s+/g, "");
    if (upper.includes("40") && upper.includes("HC"))
        return "40HC";
    if (upper.includes("40"))
        return "40GP";
    if (upper.includes("20"))
        return "20GP";
    if (upper.includes("LCL"))
        return "LCL";
    return upper || "20GP";
}
export function resolveDestinationPortFromMarket(targetMarket) {
    if (!targetMarket)
        return "NLRTM";
    const key = targetMarket.trim().toUpperCase();
    return TARGET_MARKET_POD[key] ?? normalizePortCode(targetMarket);
}
//# sourceMappingURL=port-normalize.js.map