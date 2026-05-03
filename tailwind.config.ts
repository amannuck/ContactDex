import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["var(--font-pixelify)", "sans-serif"],
        "pixel-display": ["var(--font-pixelify)", "sans-serif"],
      },
      keyframes: {
        flashcardInFromRight: {
          "0%": {
            opacity: "0.15",
            transform: "translateX(22%) scale(0.94)",
          },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        flashcardInFromLeft: {
          "0%": {
            opacity: "0.15",
            transform: "translateX(-22%) scale(0.94)",
          },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
      },
      animation: {
        "flashcard-in-next":
          "flashcardInFromRight 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "flashcard-in-prev":
          "flashcardInFromLeft 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
