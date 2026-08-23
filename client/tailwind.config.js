/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // We inject our custom CSS variables here
      colors: {
        theme: {
          bg: 'var(--color-bg-main)',
          panel: 'var(--color-bg-panel)',
          text: 'var(--color-text-main)',
          muted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
        }
      }
    },
  },
  plugins: [],
}