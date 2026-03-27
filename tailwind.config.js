/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36adf6',
          500: '#0c93e7',
          600: '#0074c5',
          700: '#015da0',
          800: '#064f84',
          900: '#0b426e',
          950: '#072a49',
        },
        gold: {
          50: '#fdf8ef',
          100: '#fbeed5',
          200: '#f6daaa',
          300: '#f0c074',
          400: '#e9a03c',
          500: '#e48820',
          600: '#d56d16',
          700: '#b15214',
          800: '#8e4118',
          900: '#743716',
          950: '#3f1b09',
        },
        dark: {
          800: '#1a1a2e',
          900: '#0f0f1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out both',
        'slide-up': 'slideUp 0.8s ease-out both',
        'slide-in-left': 'slideInLeft 0.8s ease-out both',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)', '-webkit-transform': 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', '-webkit-transform': 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)', '-webkit-transform': 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)', '-webkit-transform': 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)', '-webkit-transform': 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)', '-webkit-transform': 'translateY(-20px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(228, 136, 32, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(228, 136, 32, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
