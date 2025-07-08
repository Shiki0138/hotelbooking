import formsPlugin from '@tailwindcss/forms';
import typographyPlugin from '@tailwindcss/typography';
import aspectRatioPlugin from '@tailwindcss/aspect-ratio';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fad7a5',
          300: '#f6bb6d',
          400: '#f19533',
          500: '#ed7611',
          600: '#dd5b0b',
          700: '#b6440d',
          800: '#923611',
          900: '#762f11',
          950: '#401607',
        },
        secondary: {
          50: '#f4f6f7',
          100: '#e2e8ec',
          200: '#c9d3db',
          300: '#a3b4c1',
          400: '#768da0',
          500: '#5b7185',
          600: '#4e5e71',
          700: '#44505e',
          800: '#3d4550',
          900: '#363c45',
          950: '#22262d',
        },
        background: {
          light: '#ffffff',
          dark: '#1a1b1f',
          darker: '#0f1012',
        },
        surface: {
          light: '#f9fafb',
          DEFAULT: '#ffffff',
          dark: '#24252a',
          darker: '#1a1b1f',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.8)',
          dark: 'rgba(36, 37, 42, 0.8)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'pulse-soft': 'pulseSoft 3s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { 
            transform: 'translateY(20px)',
            opacity: '0',
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        slideDown: {
          '0%': { 
            transform: 'translateY(-10px)',
            opacity: '0',
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        scaleIn: {
          '0%': { 
            transform: 'scale(0.95)',
            opacity: '0',
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(241, 149, 51, 0.3)',
        'glow-lg': '0 0 40px rgba(241, 149, 51, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(241, 149, 51, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-radial-dark': 'radial-gradient(circle at 30% 20%, rgba(241, 149, 51, 0.1) 0%, transparent 50%)',
        'shimmer': 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.7) 50%, transparent 60%)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      gridTemplateColumns: {
        'auto-fit-280': 'repeat(auto-fit, minmax(280px, 1fr))',
        'auto-fill-280': 'repeat(auto-fill, minmax(280px, 1fr))',
      },
      zIndex: {
        'dropdown': '1000',
        'modal': '1040',
        'popover': '1030',
        'tooltip': '1080',
        'notification': '1050',
      },
    },
  },
  plugins: [
    formsPlugin,
    typographyPlugin,
    aspectRatioPlugin,
    function({ addUtilities, addComponents, theme }) {
      // Glassmorphism utilities
      addUtilities({
        '.glass': {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
        '.glass-dark': {
          background: 'rgba(36, 37, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-minimal': {
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
        },
      });

      // Premium gradient utilities
      addUtilities({
        '.gradient-premium': {
          background: 'linear-gradient(135deg, #f19533 0%, #ed7611 100%)',
        },
        '.gradient-premium-dark': {
          background: 'linear-gradient(135deg, #ed7611 0%, #dd5b0b 100%)',
        },
        '.gradient-surface': {
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        },
        '.gradient-surface-dark': {
          background: 'linear-gradient(135deg, #24252a 0%, #1a1b1f 100%)',
        },
      });

      // Design system components
      addComponents({
        '.btn-premium': {
          '@apply': 'bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium py-3 px-6 rounded-xl shadow-soft hover:shadow-lg transform hover:scale-102 transition-all duration-300',
        },
        '.card-glass': {
          '@apply': 'glass dark:glass-dark rounded-2xl p-6 shadow-soft',
        },
        '.input-modern': {
          '@apply': 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200',
        },
      });

      // Text gradient utilities
      addUtilities({
        '.text-gradient': {
          background: 'linear-gradient(135deg, #f19533 0%, #ed7611 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
      });
    }
  ],
}