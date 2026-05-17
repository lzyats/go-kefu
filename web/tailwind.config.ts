/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          brand: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
          },
          magenta: {
            50: '#fef0f5',
            100: '#fdd0e3',
            200: '#fca1c7',
            300: '#f972ab',
            400: '#f5438f',
            500: '#ec319f',
            600: '#d1288a',
            700: '#b01f73',
            800: '#8f185c',
            900: '#6e1145',
            950: '#4d0a2e',
          },
          surface: {
            DEFAULT: '#ffffff',
            subtle: '#f8fafc',
            muted: '#f1f5f9',
            elevated: '#ffffff',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        },
        boxShadow: {
          'soft': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          'card': '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          'elevated': '0 8px 32px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.02)',
          'glow': '0 0 20px rgba(20,184,166,0.15)',
        },
        borderRadius: {
          '2xl': '1rem',
          '3xl': '1.5rem',
        },
      },
    },
    plugins: [],
  }