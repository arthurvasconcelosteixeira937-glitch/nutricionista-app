/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1E3F', 50: '#EEF2F9', 100: '#D6DFEE', 700: '#14305F', 800: '#0F2650', 900: '#0B1E3F', 950: '#06122A' },
        energia: { DEFAULT: '#FFC93C', 50: '#FFF8E1', 100: '#FFEDB3', 600: '#E6A900' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s ease-out both',
        pop: 'pop .25s ease-out both',
        float: 'float 4s ease-in-out infinite',
        shake: 'shake .3s ease-in-out',
      },
    },
  },
  plugins: [],
}
