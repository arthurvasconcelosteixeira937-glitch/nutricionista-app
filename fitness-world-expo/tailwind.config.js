/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07080b', 900: '#0b0d12', 850: '#10131a', 800: '#151922', 700: '#1d2230', 600: '#2a3142', 500: '#3b4459' },
        gold: { 300: '#f3dc9b', 400: '#e9c46a', 500: '#d4a83f', 600: '#b08425' },
        volt: { 400: '#4ff0c8', 500: '#1fd6a8' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { widest2: '0.32em' },
    },
  },
  plugins: [],
};
