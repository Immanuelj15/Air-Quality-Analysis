/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0a0f1d',
        darkCard: 'rgba(30, 41, 59, 0.7)',
        accentColor: '#10b981',
      }
    },
  },
  plugins: [],
}
