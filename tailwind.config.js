/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        pulse: "pulse 2s infinite",
        travelWave: "travelWave 10s linear infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        travelWave: {
          from: { transform: "translateX(-33.33%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
