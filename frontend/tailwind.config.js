/** @type {import('tailwindcss').Config} */
const { night, sage } = require('./src/lib/themePalette.json')

module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        night,
        sage,
        green: {
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
      },
      keyframes: {
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, 0)',
          },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
