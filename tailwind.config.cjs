/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-purple': '#6f42c1',
        'brand-teal': '#20c997',
        'brand-dark': '#1a202c',
        'brand-light': '#f7fafc',
      }
    },
  },
  plugins: [],
}