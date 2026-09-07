/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rail-dark': '#0f172a',
        'rail-card': '#1e293b',
      }
    },
  },
  plugins: [],
}
