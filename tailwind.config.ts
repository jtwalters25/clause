import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        paper: "#FFFDF0",
        magenta: "#E6007A",
        violet: "#7C3AED",
        acid: "#E8FF00",
        mint: "#00C2A8",
        // verdict palette (severity semantics)
        standard: "#00C2A8", // safe   — teal/mint
        review: "#E8FF00", // caution — acid yellow
        block: "#E6007A", // danger  — magenta
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        brutal: "6px 6px 0 0 #0A0A0A",
        "brutal-sm": "4px 4px 0 0 #0A0A0A",
        "brutal-lg": "10px 10px 0 0 #0A0A0A",
        "brutal-violet": "6px 6px 0 0 #7C3AED",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
