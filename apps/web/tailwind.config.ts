import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0b0f14',
        surface: '#121923',
        glass: 'rgba(255,255,255,0.08)',
        cyan: '#4ef1ff',
        teal: '#22d3ee',
        neon: '#00f0ff',
      },
      boxShadow: {
        glow: '0 0 40px rgba(78,241,255,0.2)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
      },
    },
    fontFamily: {
      sans: ['var(--font-inter)'],
      display: ['var(--font-space)'],
    },
  },
  plugins: [],
};

export default config;
