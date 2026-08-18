/** Common UN/LOCODE → [lng, lat] for live-map preview. */
export type LngLat = [number, number];

export const PORT_COORDS: Record<string, LngLat> = {
  CNSHA: [121.47, 31.23],
  SGSIN: [103.85, 1.29],
  NLRTM: [4.48, 51.92],
  DEHAM: [9.98, 53.54],
  BEANR: [4.32, 51.26],
  USLAX: [-118.27, 33.74],
  USNYC: [-74.05, 40.68],
  AEJEA: [55.06, 25.02],
  TRMER: [34.64, 36.8],
  TRIST: [28.98, 41.02],
  TRAMB: [28.68, 40.96],
  TRALI: [26.42, 38.78],
  QAHMD: [51.61, 25.29],
  HAMAD: [51.61, 25.29],
  ITGOA: [8.92, 44.4],
  FRLEH: [0.11, 49.49],
  GBFXT: [1.31, 51.95],
  HKHKG: [114.17, 22.3],
  KRPUS: [129.04, 35.1],
};

const PORT_ALIASES: Record<string, string> = {
  HAMAD: "QAHMD",
  "HAMAD PORT": "QAHMD",
  ROTTERDAM: "NLRTM",
  SHANGHAI: "CNSHA",
  SINGAPORE: "SGSIN",
  HAMBURG: "DEHAM",
  GENOA: "ITGOA",
  MERSIN: "TRMER",
  ISTANBUL: "TRIST",
  AMBARLI: "TRAMB",
  ALIAGA: "TRALI",
  TURKEY: "TRMER",
  QATAR: "QAHMD",
};

/** Sea-lane waypoints so vessels stay on water (not great-circle over land). */
const SEA_LANE_VIA: Record<string, LngLat[]> = {
  // Mersin → Qatar: East Med → Suez → Red Sea → Bab el-Mandeb →
  // Gulf of Aden (south of Yemen) → Arabian Sea (south of Oman) →
  // Gulf of Oman → Hormuz → Persian Gulf. Never cut across Arabia.
  "TRMER>QAHMD": [
    [33.2, 34.4],
    [32.4, 31.6],
    [32.35, 30.0],
    [33.2, 28.2],
    [36.5, 22.5],
    [39.5, 18.5],
    [42.8, 14.2],
    [43.5, 10.8],
    [45.5, 9.0],
    [48.5, 8.5],
    [52.0, 8.8],
    [55.5, 10.0],
    [58.5, 12.8],
    [60.2, 17.5],
    [59.5, 23.2],
    [57.2, 25.8],
    [55.0, 26.3],
    [53.0, 26.0],
  ],
  "TRMER>AEJEA": [
    [33.2, 34.4],
    [32.4, 31.6],
    [32.35, 30.0],
    [33.2, 28.2],
    [36.5, 22.5],
    [39.5, 18.5],
    [42.8, 14.2],
    [43.5, 10.8],
    [45.5, 9.0],
    [48.5, 8.5],
    [52.0, 8.8],
    [55.5, 10.0],
    [58.5, 12.8],
    [60.2, 17.5],
    [59.5, 23.2],
    [57.2, 25.8],
    [55.5, 25.4],
  ],
  // Mersin → Genoa: stay in Med
  "TRMER>ITGOA": [
    [32.5, 36.0],
    [28.0, 35.5],
    [22.0, 35.2],
    [15.0, 36.5],
    [10.5, 40.5],
  ],
  // Asia → N Europe (rough Malacca / Suez alternate kept simple via Indian Ocean + Suez)
  "CNSHA>NLRTM": [
    [122.0, 28.0],
    [120.0, 20.0],
    [114.0, 12.0],
    [108.0, 5.0],
    [104.0, 1.5],
    [95.0, 5.0],
    [80.0, 5.0],
    [60.0, 12.0],
    [43.5, 12.5],
    [38.0, 20.0],
    [32.5, 29.5],
    [30.0, 32.0],
    [18.0, 36.0],
    [5.0, 40.0],
    [2.0, 48.0],
  ],
};

function normalizePortKey(codeOrLabel: string): string | null {
  const raw = codeOrLabel.trim().toUpperCase();
  if (PORT_COORDS[raw]) return raw;
  const alias = PORT_ALIASES[raw];
  if (alias) return alias;
  const token = raw.match(/\b([A-Z]{5})\b/)?.[1];
  if (token && PORT_COORDS[token]) return token;
  for (const [name, code] of Object.entries(PORT_ALIASES)) {
    if (raw.includes(name)) return code;
  }
  for (const code of Object.keys(PORT_COORDS)) {
    if (raw.includes(code)) return code;
  }
  return null;
}

export function resolvePortLngLat(codeOrLabel: string | null | undefined): LngLat | null {
  if (!codeOrLabel) return null;
  const key = normalizePortKey(codeOrLabel);
  return key ? PORT_COORDS[key] ?? null : null;
}

export function interpolateLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  const u = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Build a maritime polyline (origin → via → destination) when a lane is known. */
export function seaRoutePolyline(
  originCode: string | null | undefined,
  destCode: string | null | undefined,
): LngLat[] | null {
  const oKey = originCode ? normalizePortKey(originCode) : null;
  const dKey = destCode ? normalizePortKey(destCode) : null;
  const o = oKey ? PORT_COORDS[oKey] : null;
  const d = dKey ? PORT_COORDS[dKey] : null;
  if (!o || !d || !oKey || !dKey) return null;

  const via =
    SEA_LANE_VIA[`${oKey}>${dKey}`] ??
    [...(SEA_LANE_VIA[`${dKey}>${oKey}`] ?? [])].reverse();

  if (via.length === 0) return [o, d];
  return [o, ...via, d];
}

/** Distance-weighted position along a polyline (t in 0..1). */
export function interpolateAlongRoute(route: LngLat[], t: number): LngLat {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0]!;
  const u = Math.min(1, Math.max(0, t));
  if (u <= 0) return route[0]!;
  if (u >= 1) return route[route.length - 1]!;

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const len = haversineKm(route[i]!, route[i + 1]!);
    segLens.push(len);
    total += len;
  }
  if (total <= 0) return route[0]!;

  let remain = total * u;
  for (let i = 0; i < segLens.length; i++) {
    const len = segLens[i]!;
    if (remain <= len) {
      const localT = len === 0 ? 0 : remain / len;
      return interpolateLngLat(route[i]!, route[i + 1]!, localT);
    }
    remain -= len;
  }
  return route[route.length - 1]!;
}

/**
 * Vessel position for a lane. Uses sea waypoints when available so IN_TRANSIT
 * ships stay on water instead of cutting across land.
 */
export function positionOnSeaRoute(
  originCode: string | null | undefined,
  destCode: string | null | undefined,
  progress01: number,
): LngLat | null {
  const route = seaRoutePolyline(originCode, destCode);
  if (route && route.length >= 2) return interpolateAlongRoute(route, progress01);
  const o = resolvePortLngLat(originCode);
  const d = resolvePortLngLat(destCode);
  if (!o || !d) return null;
  return interpolateLngLat(o, d, progress01);
}
