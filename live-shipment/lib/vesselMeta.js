// Vessel type metadata — mirror of backend VESSEL_TYPES palette.
export const VESSEL_TYPES = [
  { code: "container", label: "Container Ship", color: "#22c55e" },
  { code: "bulk", label: "Bulk Carrier", color: "#84cc16" },
  { code: "tanker_oil", label: "Oil Tanker", color: "#ef4444" },
  { code: "tanker_chem", label: "Chemical Tanker", color: "#f43f5e" },
  { code: "lng", label: "LNG Carrier", color: "#f59e0b" },
  { code: "passenger", label: "Passenger", color: "#06b6d4" },
  { code: "roro", label: "RoRo", color: "#8b5cf6" },
  { code: "fishing", label: "Fishing", color: "#f97316" },
  { code: "military", label: "Military", color: "#64748b" },
  { code: "pleasure", label: "Pleasure Craft", color: "#ec4899" },
];

export const TYPE_COLOR = Object.fromEntries(VESSEL_TYPES.map((t) => [t.code, t.color]));
export const TYPE_LABEL = Object.fromEntries(VESSEL_TYPES.map((t) => [t.code, t.label]));

// Image bank per vessel type
export const TYPE_IMAGE = {
  container:
    "https://images.unsplash.com/photo-1613690399151-65ea69478674?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
  bulk: "https://images.unsplash.com/photo-1613690399151-65ea69478674?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
  tanker_oil:
    "https://images.pexels.com/photos/36563588/pexels-photo-36563588.jpeg?auto=compress&cs=tinysrgb&w=1200",
  tanker_chem:
    "https://images.pexels.com/photos/36563588/pexels-photo-36563588.jpeg?auto=compress&cs=tinysrgb&w=1200",
  lng: "https://images.pexels.com/photos/36563588/pexels-photo-36563588.jpeg?auto=compress&cs=tinysrgb&w=1200",
  passenger:
    "https://images.unsplash.com/photo-1599640842225-85d111c60e6b?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
  roro: "https://images.unsplash.com/photo-1613690399151-65ea69478674?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
  fishing:
    "https://images.pexels.com/photos/27041514/pexels-photo-27041514.jpeg?auto=compress&cs=tinysrgb&w=1200",
  military:
    "https://images.unsplash.com/photo-1599640842225-85d111c60e6b?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
  pleasure:
    "https://images.unsplash.com/photo-1599640842225-85d111c60e6b?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
};

// ISO country code -> flag emoji (used as small ornament, not primary icon)
export function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6;
  const codes = cc.toUpperCase().split("").map((c) => A + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codes);
}
