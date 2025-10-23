/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./hyper-runtime/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Routed Gothic Narrow", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Departure Mono", "ui-monospace", "SFMono-Regular", "SF Mono", "Consolas", "Liberation Mono", "Menlo", "monospace"],
        display: ["Routed Gothic", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      gridTemplateColumns: {
        studio: "480px minmax(0,1fr)",
      },
      colors: {
        background: "var(--bg)",
        surface: "var(--bg-elevated)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        muted: "var(--muted)",
      },
      boxShadow: {
        brand: "0 8px 24px rgba(0,0,0,0.4)",
        "brand-sm": "0 2px 8px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

