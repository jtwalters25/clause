import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // verdict palette
        standard: "#0d9488", // teal
        review: "#d97706", // amber
        block: "#dc2626", // red
      },
    },
  },
  plugins: [],
};

export default config;
