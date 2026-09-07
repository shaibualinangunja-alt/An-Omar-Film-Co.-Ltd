/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        freecut: {
          darkest: '#090b0e',
          darker: '#0e1116',
          panel: '#141820',
          elevated: '#1a1f2c',
          border: '#252c3d',
          borderLight: '#323c52',
          accent: '#00e5ff',
          accentHover: '#33ebff',
          gold: '#f59e0b',
          goldHover: '#d97706',
          video: '#0284c7',
          videoBorder: '#38bdf8',
          audio: '#059669',
          audioBorder: '#34d399',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
