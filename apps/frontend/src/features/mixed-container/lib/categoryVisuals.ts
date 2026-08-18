/** Placeholder visuals for category cards until images are uploaded */
export const CATEGORY_GRADIENTS: Record<string, string> = {
  pasta: "from-amber-100 to-orange-200",
  "wheat-flour": "from-yellow-50 to-amber-100",
  "tomato-paste": "from-red-100 to-rose-200",
  "sunflower-oil": "from-yellow-100 to-lime-100",
  "olive-oil": "from-green-100 to-emerald-200",
  pulses: "from-orange-100 to-amber-200",
  pickles: "from-lime-100 to-green-200",
  "fruit-juices": "from-orange-100 to-pink-200",
  bulgur: "from-amber-100 to-yellow-200",
  "grape-leaves": "from-green-100 to-teal-100",
  "roasted-eggplant": "from-purple-100 to-violet-200",
  "roasted-red-peppers": "from-red-100 to-orange-200",
};

export function categoryGradient(slug: string): string {
  return CATEGORY_GRADIENTS[slug] ?? "from-zinc-100 to-zinc-200";
}
