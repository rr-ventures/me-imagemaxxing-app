import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tinder: {
          pink: "#FD267A",
          orange: "#FF7854",
          dark: "#111418",
          card: "#1a1d23",
          gray: "#667180",
          "light-gray": "#8e96a3",
          border: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: ['"Avenir Next"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        pill: "9999px",
        input: "8px",
      },
    },
  },
  plugins: [],
} satisfies Config;
