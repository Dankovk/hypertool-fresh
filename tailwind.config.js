/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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
      },
      boxShadow: {
        brand: "0 8px 24px rgba(0,0,0,0.4)",
        "brand-sm": "0 2px 8px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

