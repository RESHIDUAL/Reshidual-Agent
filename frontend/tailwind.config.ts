import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './theme/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--md-sys-color-primary)',
        'on-primary': 'var(--md-sys-color-on-primary)',
        'primary-container': 'var(--md-sys-color-primary-container)',
        surface: 'var(--md-sys-color-surface)',
        'surface-container': 'var(--md-sys-color-surface-container)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
        'on-surface': 'var(--md-sys-color-on-surface)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
        outline: 'var(--md-sys-color-outline)',
        'outline-variant': 'var(--md-sys-color-outline-variant)',
        secondary: 'var(--md-sys-color-secondary)',
        'secondary-container': 'var(--md-sys-color-secondary-container)',
        tertiary: 'var(--md-sys-color-tertiary)',
        'tertiary-container': 'var(--md-sys-color-tertiary-container)',
        error: 'var(--md-sys-color-error)',
        'error-container': 'var(--md-sys-color-error-container)',
        success: 'var(--md-sys-color-success)',
        'success-container': 'var(--md-sys-color-success-container)',
        'inverse-surface': 'var(--md-sys-color-inverse-surface)',
        'inverse-on-surface': 'var(--md-sys-color-inverse-on-surface)',
        'surface-tint': 'var(--md-sys-color-surface-tint)',
        shadow: 'var(--md-sys-color-shadow)',
      },
      borderRadius: {
        'md3-sm': '8px',
        'md3-md': '12px',
        'md3-lg': '16px',
        'md3-xl': '28px',
      },
      boxShadow: {
        'elevation-1': '0px 1px 3px 1px var(--md-sys-color-shadow), 0px 1px 2px 0px var(--md-sys-color-shadow)',
        'elevation-2': '0px 2px 6px 2px var(--md-sys-color-shadow), 0px 1px 2px 0px var(--md-sys-color-shadow)',
        'elevation-3': '0px 1px 3px 0px var(--md-sys-color-shadow), 0px 4px 8px 3px var(--md-sys-color-shadow)',
        'elevation-4': '0px 2px 3px 0px var(--md-sys-color-shadow), 0px 6px 10px 4px var(--md-sys-color-shadow)',
        'elevation-5': '0px 4px 4px 0px var(--md-sys-color-shadow), 0px 8px 12px 6px var(--md-sys-color-shadow)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'spring-press': 'spring-press 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
        'fade-in': 'fade-in 0.2s ease-in both',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'spring-press': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        }
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    },
  },
  plugins: [],
}
export default config