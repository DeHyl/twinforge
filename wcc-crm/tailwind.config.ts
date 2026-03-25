import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        wcc: {
          50: "#fef7ee",
          100: "#fdedd3",
          200: "#f9d6a5",
          300: "#f5b86d",
          400: "#f09132",
          500: "#ed7712",
          600: "#de5d08",
          700: "#b84509",
          800: "#93370e",
          900: "#772f0f",
        },
        slate: {
          750: "#293548",
          850: "#172033",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
