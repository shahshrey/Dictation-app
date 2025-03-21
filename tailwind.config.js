const { themeColors, themeRadii, themeAnimations, themeKeyframes } = require('./src/renderer/lib/theme.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: themeColors,
      borderRadius: themeRadii,
      keyframes: themeKeyframes,
      animation: themeAnimations,
      backgroundSize: {
        'gradient-size': '200% 200%',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
