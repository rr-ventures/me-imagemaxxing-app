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
          primary: "#FD267A", // Radical Red
          secondary: "#FF6036", // Red Orange
          gradient: "linear-gradient(45deg, #FD267A 0%, #FF6036 100%)",
          blue: "#2196F3",
          purple: "#A307BA",
          green: "#4ECC94",
          gold: "#E3C067",
          dark: "#111418", // Obsidian background
          card: "#1a1d23",
          gray: "#505965",
          "light-gray": "#d4d8de",
          border: "rgba(255,255,255,0.08)",
          input: "#21262E",
        },
      },
      fontFamily: {
        sans: ['"Proxima Nova"', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "9999px",
        input: "12px",
      },
      boxShadow: {
        card: "0 10px 20px rgba(0,0,0,0.08)",
        floating: "0 4px 12px rgba(0,0,0,0.15)",
        glow: "0 0 20px rgba(253, 38, 122, 0.3)",
      },
      backgroundImage: {
        'tinder-gradient': 'linear-gradient(45deg, #FD267A 0%, #FF6036 100%)',
      }
    },
  },
  plugins: [],
} satisfies Config;
