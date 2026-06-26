/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/contracts/src/**/*.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["Inter Tight", "system-ui", "sans-serif"],
        display: ["Fraunces", "Inter Tight", "serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Premium enterprise palette — deep ink on near-white parchment.
        ink:    { 950: "#0b1020", 900: "#13192e", 800: "#1c233e" },
        paper:  { 50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7" },
        accent: { 50: "#eef2ff", 600: "#3949ab", 900: "#1a237e" },
      },
      boxShadow: {
        card:     "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        cardHover:"0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
        modal:    "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1rem" },
      keyframes: {
        "fade-in":   { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "slide-in":  { "0%": { opacity: "0", transform: "translateX(8px)"  }, "100%": { opacity: "1", transform: "translateX(0)" } },
        "drawer-in": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in":   "fade-in 0.25s ease-out",
        "slide-in":  "slide-in 0.2s ease-out",
        "drawer-in": "drawer-in 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
