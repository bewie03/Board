/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bone: {
          50: '#fefdf9',
          100: '#fdf9f0',
          200: '#f9f0e0',
          300: '#f3e6cc',
          400: '#ebd4a8',
          500: '#e1c084',
          600: '#d4a574',
          700: '#c18a5e',
          800: '#a6724d',
          900: '#8b5e3f',
        },
        cardano: {
          blue: '#0033AD',
          lightblue: '#1B4F8C',
          navy: '#001F5C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bone: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s infinite',
      }
    },
  },
  plugins: [],
}
