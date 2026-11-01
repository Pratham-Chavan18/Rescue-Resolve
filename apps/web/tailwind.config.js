/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Swiggy Design System tokens
        background: '#FFFFFF',
        foreground: '#282C3F',
        brand: '#FC8019',
        muted: '#686B78',
        border: '#E9E9EB',
        card: '#FFFFFF',
        accent: '#FC8019',
        yellow: '#F3C334',

        // Semantic status tokens
        ok: '#1BA672',
        'ok-soft': '#EAF7F1',
        warn: '#C77400',
        'warn-soft': '#FFF6E5',
        bad: '#D7263D',
        'bad-soft': '#FDECEF',

        // Compatibility aliases with existing codebase
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        'surface-sunk': '#F7F7F9',
        ink: '#282C3F',
        'ink-2': '#686B78',
        line: '#E9E9EB',
        'accent-ink': '#FC8019',
        'accent-soft': '#FFF3E8',
      },
      fontFamily: {
        sans: [
          '"Basis Grotesque Pro"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"Basis Grotesque Pro"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        body: [
          '"Basis Grotesque Pro"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '4px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
        pill: '9999px',
        full: '9999px',
      },
      fontSize: {
        display: ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['20px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }],
        body: ['14px', { lineHeight: '1.4' }],
        meta: ['12px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },
    },
  },
  plugins: [],
};
