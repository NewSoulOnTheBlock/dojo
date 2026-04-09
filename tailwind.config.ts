import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mim: {
          void: '#0d0b1a',
          dark: '#1a1530',
          purple: '#8b5cf6',
          'purple-dark': '#6d28d9',
          'purple-light': '#a78bfa',
          green: '#34d399',
          'green-light': '#6ee7b7',
          gold: '#fbbf24',
          'gold-light': '#fcd34d',
          'gold-dark': '#d97706',
          ink: '#2e1f4d',
          paper: '#1e1638',
          ash: '#9ca3af',
        },
        cream: '#f0e6dc',
        parchment: '#d4c0a8',
        arcane: '#22d3ee',
        smoke: '#9b5de5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Impact', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'smoke-rise': 'smoke-rise 6s ease-out infinite',
        'ember-glow': 'ember-glow 3s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
      },
      keyframes: {
        'smoke-rise': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.4' },
          '50%': { transform: 'translateY(-20px) scale(1.3)', opacity: '0.2' },
          '100%': { transform: 'translateY(-40px) scale(1.6)', opacity: '0' },
        },
        'ember-glow': {
          '0%, 100%': { opacity: '0.6', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.2)' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
