/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🛑 THE FIX: Flattened the colors object so classes are just 'bg-theme-accent'
      colors: {
        'theme-accent': 'var(--theme-accent, #FF2D88)', // Falls back to pink
        'theme-bg': 'var(--theme-bg, #FFFFFF)', 
        'theme-panel': 'var(--theme-panel, #F5F5F5)', 
        'theme-text': 'var(--theme-text, #333333)', 
        'theme-muted': 'var(--theme-muted, #666666)', 
        'theme-border': 'var(--theme-border, #CCCCCC)', 
      }
    },
  },
  plugins: [],
}