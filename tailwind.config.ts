import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        cloud: "#f6f9fc",
        ocean: "#0b6eea",
        mint: "#19c9a7"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(7, 17, 31, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
